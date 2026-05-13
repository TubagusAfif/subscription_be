import { AppError } from '../../shared/middlewares/error.middleware';
import { CoinOrderRepository } from '../repositories/coin-order.repository';
import { CoinWalletRepository } from '../repositories/coin-wallet.repository';
import { CoinTransactionRepository } from '../repositories/coin-transaction.repository';
import { BundleRepository } from '../../subscription/repositories/bundle.repository';
import { MpgService } from '../../shared/services/mpg.service';
import { PrismaClient, CoinOrder } from '@prisma/client';
import crypto from 'crypto';
import { env } from '../../shared/config/env';

export interface CoinOrderServiceDeps {
  coinOrderRepository: CoinOrderRepository;
  coinWalletRepository: CoinWalletRepository;
  coinTransactionRepository: CoinTransactionRepository;
  bundleRepository: BundleRepository;
  mpgService: MpgService;
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
  private readonly walletRepo: CoinWalletRepository;
  private readonly transactionRepo: CoinTransactionRepository;
  private readonly bundleRepo: BundleRepository;
  private readonly mpgService: MpgService;
  private readonly prisma: PrismaClient;

  constructor(deps: CoinOrderServiceDeps) {
    this.coinOrderRepo = deps.coinOrderRepository;
    this.walletRepo = deps.coinWalletRepository;
    this.transactionRepo = deps.coinTransactionRepository;
    this.bundleRepo = deps.bundleRepository;
    this.mpgService = deps.mpgService;
    this.prisma = deps.prisma;
  }

  /** 
  ---------------------------------------------------------------
    Creates a coin purchase order and initiates MPG payment inquiry.
    Returns checkout_url for the client to redirect the customer.
  ---------------------------------------------------------------
  **/
  async createOrder(
    userId: number,
    bundleId: number,
    user: { id: number; name: string; email: string; phone?: string },
    paymentSource: 'va' | 'qris' = 'va',
  ): Promise<{ order: CoinOrder; checkout_url: string }> {
    // Validate bundle exists and is active
    const bundle = await this.bundleRepo.findById(bundleId);
    if (!bundle) {
      throw new AppError('BUNDLE_NOT_FOUND', `Coin bundle with ID ${bundleId} not found.`, 404);
    }

    // Calculate pricing
    const price = bundle.discounted_price ? Number(bundle.discounted_price) : Number(bundle.price);
    const taxAmount = price * (Number(bundle.tax_rate) / 100);
    const totalPrice = Math.round(price + taxAmount);

    // Generate unique order ID for MPG
    const pgOrderId = `COIN-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Build reference URL for MPG
    const referenceUrl = `${env.CLIENT_APP_URL}/payment/status?order_id=${pgOrderId}`;

    // Create the order record
    const order = await this.coinOrderRepo.create({
      user_id: userId,
      bundle_id: bundleId,
      is_custom_qty: false,
      coin_amount: bundle.coin_amount,
      currency_id: bundle.currency_id,
      price_paid: totalPrice,
      tax_amount: taxAmount,
      status: 'PENDING',
      pg_order_id: pgOrderId,
      created_by: userId,
      updated_by: userId,
    });

    // Create MPG payment inquiry
    const inquiryResult = await this.mpgService.createInquiry({
      amount: totalPrice,
      currency: 'IDR',
      referenceUrl,
      orderId: pgOrderId,
      customer: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phone || '',
      },
      paymentSource,
    });

    // Save MPG response ID and checkout URL to order
    await this.prisma.coinOrder.update({
      where: { id: order.id },
      data: {
        pg_response_id: inquiryResult.id,
        redirect_url: inquiryResult.checkoutUrl,
      },
    });

    return {
      order: {
        ...order,
        pg_response_id: inquiryResult.id,
        redirect_url: inquiryResult.checkoutUrl,
      },
      checkout_url: inquiryResult.checkoutUrl,
    };
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
    Handles successful payment callback — credits coins to wallet.
  ---------------------------------------------------------------
  **/
  async handlePaymentSuccess(pgOrderId: string): Promise<void> {
    const order = await this.coinOrderRepo.findByPgOrderId(pgOrderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order ${pgOrderId} not found.`, 404);
    }

    // Avoid double-crediting
    if (order.status === 'PAID') return;

    // Wrap in transaction — order update, wallet credit, and transaction log
    // must all succeed or all roll back
    await this.prisma.$transaction(async (tx) => {
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

    await this.coinOrderRepo.updateStatus(order.id, 'FAILED');
  }
}
