import { AppError } from '../../shared/middlewares/error.middleware';
import { CoinOrderRepository } from '../repositories/coin-order.repository';
import { CoinWalletRepository } from '../repositories/coin-wallet.repository';
import { CoinTransactionRepository } from '../repositories/coin-transaction.repository';
import { BundleRepository } from '../../subscription/repositories/bundle.repository';
import { CurrencyRepository } from '../../subscription/repositories/currency.repository';
import { PaymentMethodRepository } from '../../shared/repositories/payment-method.repository';
import { PrismaClient, Prisma, CoinOrder } from '@prisma/client';
import crypto from 'crypto';
import { env } from '../../shared/config/env';

// A PENDING order older than this is considered abandoned and is expired
// on the next purchase attempt, so a stuck/abandoned checkout never locks
// the user out of creating new orders permanently.
const PENDING_ORDER_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface CoinOrderServiceDeps {
  coinOrderRepository: CoinOrderRepository;
  coinWalletRepository: CoinWalletRepository;
  coinTransactionRepository: CoinTransactionRepository;
  bundleRepository: BundleRepository;
  currencyRepository: CurrencyRepository;
  paymentMethodRepository: PaymentMethodRepository;
  prisma: PrismaClient;
}

/** 
---------------------------------------------------------------
  Service handling coin order creation, MPG payment flow,
  and wallet crediting upon successful payment.
---------------------------------------------------------------
**/
export class CoinOrderService {
  private readonly coinOrderRepo: CoinOrderRepository;
  private readonly bundleRepo: BundleRepository;
  private readonly prisma: PrismaClient;
  private readonly currencyRepo: CurrencyRepository;
  private readonly paymentMethodRepo: PaymentMethodRepository;

  constructor(deps: CoinOrderServiceDeps) {
    this.coinOrderRepo = deps.coinOrderRepository;
    this.bundleRepo = deps.bundleRepository;
    this.prisma = deps.prisma;
    this.currencyRepo = deps.currencyRepository;
    this.paymentMethodRepo = deps.paymentMethodRepository;
  }

  /**
  ---------------------------------------------------------------
    Ensures the user has no active (non-stale) PENDING order.
    A PENDING order older than PENDING_ORDER_TTL_MS is treated as
    abandoned: it is expired so the user is never permanently locked
    out by a stuck checkout. NOTE: this is a best-effort check —
    the hard guarantee is the partial unique index
    `coin_orders_one_pending_per_user`, which is enforced atomically
    when the order row is created (see saveOrder / saveCustomOrder).
  ---------------------------------------------------------------
  **/
  private async assertNoActivePendingOrder(userId: number): Promise<void> {
    const pendingOrder = await this.coinOrderRepo.findPendingByUserId(userId);
    if (!pendingOrder) return;

    const ageMs = Date.now() - pendingOrder.created_at.getTime();
    if (ageMs > PENDING_ORDER_TTL_MS) {
      // Abandoned checkout — expire it so a new order can be created.
      await this.coinOrderRepo.updateStatus(pendingOrder.id, 'EXPIRED');
      return;
    }

    throw new AppError(
      'PENDING_ORDER_EXISTS',
      'You have a pending transaction. Please finish or cancel it before creating a new one.',
      422,
    );
  }

  /**
  ---------------------------------------------------------------
    Maps a unique-constraint violation on order creation to the
    user-facing PENDING_ORDER_EXISTS error (the partial unique index
    fires when a concurrent request already created a PENDING order).
  ---------------------------------------------------------------
  **/
  private isPendingOrderConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  async prepareBundleOrder(userId: number, bundleId: number, paymentMethodId: number, activeTax: any) {
    await this.assertNoActivePendingOrder(userId);

    const bundle = await this.bundleRepo.findById(bundleId);

    if (!bundle) {
      throw new AppError('BUNDLE_NOT_FOUND', `Coin bundle with ID ${bundleId} not found.`, 404);
    }

    const paymentMethod = await this.paymentMethodRepo.findById(paymentMethodId);
    if (!paymentMethod || !paymentMethod.is_active) {
      throw new AppError(
        'INVALID_PAYMENT_METHOD',
        `Payment method is not available or inactive.`,
        400,
      );
    }

    const basePrice = bundle.discounted_price
      ? Number(bundle.discounted_price)
      : Number(bundle.price);
    const taxAmount = activeTax ? basePrice * (Number(activeTax.tax_value) / 100) : 0;

    // Calculate gateway fee
    let gatewayFee = 0;
    if (paymentMethod.fee_type === 'PERCENTAGE') {
      gatewayFee = (basePrice + taxAmount) * (Number(paymentMethod.fee_value) / 100);
    } else {
      gatewayFee = Number(paymentMethod.fee_value);
    }
    gatewayFee = Math.round(gatewayFee);

    const totalPrice = Math.round(basePrice + taxAmount + gatewayFee);

    const pgOrderId = `COIN-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const referenceUrl = `${env.BASE_URL}/api/v1/megabank/coin-order/${pgOrderId}`;

    return {
      bundle,
      basePrice,
      taxAmount,
      gatewayFee,
      totalPrice,
      paymentMethod,
      pgOrderId,
      referenceUrl,
    };
  }

  async prepareCustomOrder(
    userId: number,
    coinAmount: number,
    activeTax: any,
    paymentMethodId: number,
  ) {
    await this.assertNoActivePendingOrder(userId);

    const activeCurrency = await this.currencyRepo.findActive();

    if (!activeCurrency) {
      throw new AppError('INACTIVE_CURRENCY', "There's no active currency", 404);
    }

    const paymentMethod = await this.paymentMethodRepo.findById(paymentMethodId);
    if (!paymentMethod || !paymentMethod.is_active) {
      throw new AppError(
        'INVALID_PAYMENT_METHOD',
        `Payment method is not available or inactive.`,
        400,
      );
    }

    const basePrice = Math.round(coinAmount * Number(activeCurrency.conversion_rate));

    let taxAmount = 0;
    if (activeTax) {
      if (activeTax.tax_type === 'PERCENTAGE') {
        taxAmount = basePrice * (Number(activeTax.tax_value) / 100);
      } else {
        taxAmount = Number(activeTax.tax_value);
      }
    }

    // Calculate gateway fee
    let gatewayFee = 0;
    if (paymentMethod.fee_type === 'PERCENTAGE') {
      gatewayFee = (basePrice + taxAmount) * (Number(paymentMethod.fee_value) / 100);
    } else {
      gatewayFee = Number(paymentMethod.fee_value);
    }
    gatewayFee = Math.round(gatewayFee);

    const totalPrice = Math.round(basePrice + taxAmount + gatewayFee);

    const pgOrderId = `COIN-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const referenceUrl = `${env.BASE_URL}/api/v1/megabank/coin-order/${pgOrderId}`;

    return {
      pgOrderId,
      referenceUrl,
      basePrice,
      taxAmount,
      gatewayFee,
      totalPrice,
      activeCurrency,
      paymentMethod,
    };
  }

  async saveCustomOrder(
    userId: number,
    coinAmount: number,
    currencyId: number,
    basePrice: number,
    taxAmount: number,
    gatewayFee: number,
    totalPrice: number,
    paymentMethodId: number,
    pgOrderId: string,
  ): Promise<{ order: CoinOrder }> {
    try {
      const order = await this.coinOrderRepo.create({
        user_id: userId,
        is_custom_qty: true,
        coin_amount: coinAmount,
        currency_id: currencyId,
        coin_price: basePrice,
        tax_amount: taxAmount,
        gateway_fee: gatewayFee,
        price_paid: totalPrice,
        payment_method_id: paymentMethodId,
        status: 'PENDING',
        pg_order_id: pgOrderId,
        created_by: userId,
        updated_by: userId,
      });

      return { order };
    } catch (error) {
      if (this.isPendingOrderConflict(error)) {
        throw new AppError(
          'PENDING_ORDER_EXISTS',
          'You have a pending transaction. Please finish or cancel it before creating a new one.',
          422,
        );
      }
      throw error;
    }
  }

  async saveOrder(
    userId: number,
    bundleId: number,
    bundle: any,
    basePrice: number,
    taxAmount: number,
    gatewayFee: number,
    totalPrice: number,
    paymentMethodId: number,
    pgOrderId: string,
  ): Promise<{ order: CoinOrder }> {
    try {
      const order = await this.coinOrderRepo.create({
        user_id: userId,
        bundle_id: bundleId,
        is_custom_qty: false,
        coin_amount: bundle.coin_amount,
        currency_id: bundle.currency_id,
        coin_price: basePrice,
        tax_amount: taxAmount,
        gateway_fee: gatewayFee,
        price_paid: totalPrice,
        payment_method_id: paymentMethodId,
        status: 'PENDING',
        pg_order_id: pgOrderId,
        created_by: userId,
        updated_by: userId,
      });

      return { order };
    } catch (error) {
      if (this.isPendingOrderConflict(error)) {
        throw new AppError(
          'PENDING_ORDER_EXISTS',
          'You have a pending transaction. Please finish or cancel it before creating a new one.',
          422,
        );
      }
      throw error;
    }
  }

  async updateOrderPaymentInfo(
    orderId: number,
    pgResponseId: string,
    redirectUrl: string,
    paymentGateway: string,
    snapToken?: string,
  ) {
    return this.coinOrderRepo.updatePaymentInfo(
      orderId,
      pgResponseId,
      redirectUrl,
      paymentGateway,
      snapToken,
    );
  }

  /**
  ---------------------------------------------------------------
    Marks a PENDING order as FAILED. Used to roll back an order
    when the downstream payment inquiry fails, so the failed order
    does not linger as PENDING and lock the user out of retrying.
  ---------------------------------------------------------------
  **/
  async failOrder(orderId: number): Promise<void> {
    await this.coinOrderRepo.markFailedIfPending(orderId);
  }

  /** 
  ---------------------------------------------------------------
    Lists all coin orders for a user.
  ---------------------------------------------------------------
  **/
  async getUserOrders(userId: number): Promise<CoinOrder[]> {
    return this.coinOrderRepo.findByUserId(userId);
  }

  /** 
  ---------------------------------------------------------------
    Gets a single order by ID, ensures it belongs to the user.
  ---------------------------------------------------------------
  **/
  async getOrderById(orderId: number, userId: number): Promise<CoinOrder> {
    const order = await this.coinOrderRepo.findById(orderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Coin order with ID ${orderId} not found.`, 404);
    }
    if (order.user_id !== userId) {
      throw new AppError('FORBIDDEN', 'You do not have access to this order.', 403);
    }
    return order;
  }

  /**
  ---------------------------------------------------------------
    Gets a single order by PG Order ID (for unauthenticated status check).
  ---------------------------------------------------------------
  **/
  async getOrderByPgOrderId(pgOrderId: string): Promise<CoinOrder> {
    const order = await this.coinOrderRepo.findByPgOrderId(pgOrderId);
    if (!order) {
      throw new AppError(
        'ORDER_NOT_FOUND',
        `Coin order with PG Order ID ${pgOrderId} not found.`,
        404,
      );
    }
    return order;
  }

  /**
  ---------------------------------------------------------------
    Gets the user's pending order (if any) for resume flow.
  ---------------------------------------------------------------
  **/
  async getPendingOrder(userId: number): Promise<CoinOrder | null> {
    return this.coinOrderRepo.findPendingByUserId(userId);
  }

  /** 
  ---------------------------------------------------------------
    Handles successful payment callback — credits coins to wallet.
  ---------------------------------------------------------------
  **/
  async handlePaymentSuccess(
    pgOrderId: string,
    paidAmount?: number,
    paymentChannel?: string,
  ): Promise<void> {
    const order = await this.coinOrderRepo.findByPgOrderId(pgOrderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order ${pgOrderId} not found.`, 404);
    }

    // ── Amount integrity check (defense-in-depth) ──
    // Never credit coins for a payment whose notified amount does not match the
    // amount the order was created with. A paidAmount of 0/undefined means the
    // gateway did not report one (e.g. mock mode) — skip the check in that case.
    if (paidAmount !== undefined && paidAmount > 0) {
      const expected = Math.round(Number(order.price_paid));
      if (Math.round(paidAmount) !== expected) {
        throw new AppError(
          'AMOUNT_MISMATCH',
          `Paid amount ${paidAmount} does not match order total ${expected} for order ${pgOrderId}.`,
          400,
        );
      }
    }

    // Wrap in transaction — order update, wallet credit, and transaction log
    // must all succeed or all roll back
    await this.prisma.$transaction(async (tx) => {
      // ── Idempotency Guard (atomic check-and-set) ──
      // A plain findUnique() does NOT lock the row, so two concurrent webhook
      // deliveries could both read PENDING and both credit the wallet (double
      // credit). Instead, flip PENDING -> PAID with a single conditional UPDATE.
      // Postgres serializes the row write: exactly one transaction matches the
      // PENDING predicate (count === 1) and proceeds to credit; any concurrent
      // or replayed delivery sees count === 0 and exits without crediting.
      const flipped = await tx.coinOrder.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID' },
      });

      if (flipped.count === 0) {
        // Already PAID/FAILED/EXPIRED, or claimed by a concurrent delivery.
        return;
      }

      // Find or create wallet
      let wallet = await tx.coinWallet.findUnique({
        where: { user_id: order.user_id },
      });
      if (!wallet) {
        wallet = await tx.coinWallet.create({
          data: {
            user_id: order.user_id,
            balance: 0,
            currency_id: order.currency_id,
            created_by: order.user_id,
            updated_by: order.user_id,
          },
        });
      }

      // Credit coins
      await tx.coinWallet.update({
        where: { user_id: order.user_id },
        data: {
          balance: { increment: order.coin_amount },
          last_updated: new Date(),
        },
      });

      // Record transaction log — carries the payment method (from the order)
      // and the raw gateway channel so reports can calculate by payment method
      // straight from the ledger.
      await tx.coinTransaction.create({
        data: {
          wallet_id: wallet.id,
          user_id: order.user_id,
          type: 'TOPUP',
          amount: order.coin_amount,
          currency_id: order.currency_id,
          ref_id: order.id,
          payment_method_id: order.payment_method_id,
          payment_channel: paymentChannel ?? null,
          description: `Coin purchase: ${order.coin_amount} coins`,
          created_by: order.user_id,
          updated_by: order.user_id,
        },
      });
    });
  }

  /** 
  ---------------------------------------------------------------
    Handles failed/expired payment callback.
  ---------------------------------------------------------------
  **/
  async handlePaymentFailure(pgOrderId: string): Promise<void> {
    const order = await this.coinOrderRepo.findByPgOrderId(pgOrderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order ${pgOrderId} not found.`, 404);
    }

    if (order.status !== 'PENDING') return;

    // Use updateMany for atomic check-and-set to prevent TOCTOU race conditions
    await this.prisma.coinOrder.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
  }
}
