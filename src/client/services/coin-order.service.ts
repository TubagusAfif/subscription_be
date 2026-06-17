import { AppError } from '../../shared/middlewares/error.middleware';
import { CoinOrderRepository } from '../repositories/coin-order.repository';
import { CoinWalletRepository } from '../repositories/coin-wallet.repository';
import { CoinTransactionRepository } from '../repositories/coin-transaction.repository';
import { BundleRepository } from '../../subscription/repositories/bundle.repository';
import { CurrencyRepository } from '../../subscription/repositories/currency.repository';
import { PaymentMethodRepository } from '../../shared/repositories/payment-method.repository';
import { PrismaClient, CoinOrder } from '@prisma/client';
import crypto from 'crypto';
import { env } from '../../shared/config/env';

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
    Creates a coin purchase order and initiates MPG payment inquiry.
    Returns checkout_url for the client to redirect the customer.
  ---------------------------------------------------------------
  **/
  async prepareBundleOrder(userId: number, bundleId: number, paymentMethodId: number) {
    const bundle = await this.bundleRepo.findById(bundleId);

    if (!bundle) {
      throw new AppError('BUNDLE_NOT_FOUND', `Coin bundle with ID ${bundleId} not found.`, 404);
    }

    const paymentMethod = await this.paymentMethodRepo.findById(paymentMethodId);
    if (!paymentMethod || !paymentMethod.is_active) {
      throw new AppError('INVALID_PAYMENT_METHOD', `Payment method is not available or inactive.`, 400);
    }

    const basePrice = bundle.discounted_price ? Number(bundle.discounted_price) : Number(bundle.price);
    const taxAmount = basePrice * (Number(bundle.tax_rate) / 100);

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
    const referenceUrl = `${env.BASE_URL}/api/v1/client/coin-orders/status?order_id=${pgOrderId}`;

    return { bundle, basePrice, taxAmount, gatewayFee, totalPrice, paymentMethod, pgOrderId, referenceUrl };
  }

  async prepareCustomOrder(userId: number, coinAmount: number, activeTax: any, paymentMethodId: number) {
    const activeCurrency = await this.currencyRepo.findActive();

    if(!activeCurrency) {
      throw new AppError("INACTIVE_CURRENCY", "There's no active currency", 404);
    }

    const paymentMethod = await this.paymentMethodRepo.findById(paymentMethodId);
    if (!paymentMethod || !paymentMethod.is_active) {
      throw new AppError('INVALID_PAYMENT_METHOD', `Payment method is not available or inactive.`, 400);
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
    const referenceUrl = `${env.BASE_URL}/payment/status?order_id=${pgOrderId}`;
    
    return { pgOrderId, referenceUrl, basePrice, taxAmount, gatewayFee, totalPrice, activeCurrency, paymentMethod };
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
    pgOrderId: string
  ): Promise<{ order: CoinOrder }> {
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
    pgOrderId: string
  ): Promise<{ order: CoinOrder }> {
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
  }

  async updateOrderPaymentInfo(orderId: number, pgResponseId: string, redirectUrl: string) {
    return this.coinOrderRepo.updatePaymentInfo(orderId, pgResponseId, redirectUrl);
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
      throw new AppError('ORDER_NOT_FOUND', `Coin order with PG Order ID ${pgOrderId} not found.`, 404);
    }
    return order;
  }

  /** 
  ---------------------------------------------------------------
    Handles successful payment callback — credits coins to wallet.
  ---------------------------------------------------------------
  **/
  async handlePaymentSuccess(pgOrderId: string): Promise<void> {
    const order = await this.coinOrderRepo.findByPgOrderId(pgOrderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order ${pgOrderId} not found.`, 404);
    }

    // Wrap in transaction — order update, wallet credit, and transaction log
    // must all succeed or all roll back
    await this.prisma.$transaction(async (tx) => {
      // ── Idempotency Guard ──
      // Re-fetch order inside transaction to lock it and guarantee latest status.
      // This prevents race conditions if multiple webhooks arrive simultaneously.
      const txOrder = await tx.coinOrder.findUnique({
        where: { id: order.id },
      });

      if (!txOrder) throw new AppError('ORDER_NOT_FOUND', `Order ${pgOrderId} not found.`, 404);

      if (txOrder.status === 'PAID' || txOrder.status === 'FAILED') {
        // Already processed, return gracefully without updating
        return;
      }

      // Update order status
      await tx.coinOrder.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

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

      // Record transaction log
      await tx.coinTransaction.create({
        data: {
          wallet_id: wallet.id,
          user_id: order.user_id,
          type: 'TOPUP',
          amount: order.coin_amount,
          currency_id: order.currency_id,
          ref_id: order.id,
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
