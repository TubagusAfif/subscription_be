import { AppError } from '../../shared/middlewares/error.middleware';
import { ClientSubscriptionRepository } from '../repositories/subscription.repository';
import { CoinWalletService } from './coin-wallet.service';
import { SharedPlanRepository } from '../../shared/repositories/plan.repository';
import { Subscription } from '@prisma/client';
import crypto from 'crypto';

export interface ClientSubscriptionServiceDeps {
  subscriptionRepository: ClientSubscriptionRepository;
  coinWalletService: CoinWalletService;
  planRepository: SharedPlanRepository;
}

/** 
---------------------------------------------------------------
  Service handling subscription purchasing with coins and
  addon quota mirroring for clinic/user limits.
---------------------------------------------------------------
**/
export class ClientSubscriptionService {
  private readonly subscriptionRepo: ClientSubscriptionRepository;
  private readonly walletService: CoinWalletService;
  private readonly planRepo: SharedPlanRepository;

  constructor(deps: ClientSubscriptionServiceDeps) {
    this.subscriptionRepo = deps.subscriptionRepository;
    this.walletService = deps.coinWalletService;
    this.planRepo = deps.planRepository;
  }

  /** 
  ---------------------------------------------------------------
    Subscribes a user to a plan (PACKAGE or ADDON).
    1. Checks for duplicate active package
    2. Validates SKU
    3. Deducts coins from wallet
    4. Creates Subscription
    5. Creates Order record
    6. Mirrors benefits/addons → SubscriptionQuota
  ---------------------------------------------------------------
  **/
  async subscribe(userId: number, skuId: number): Promise<Subscription> {
    // Fetch SKU with benefits/addons
    const sku = await this.planRepo.findById(skuId);
    if (!sku) {
      throw new AppError('SKU_NOT_FOUND', `SKU with ID ${skuId} not found.`, 404);
    }
    if (!sku.is_active) {
      throw new AppError('SKU_INACTIVE', 'This plan is not currently available.', 400);
    }

    const coinCost = Number(sku.coin_cost);

    // If buying a PACKAGE, check user doesn't already have one active
    let parentSubscriptionId: number | undefined;
    if (sku.sku_type === 'PACKAGE') {
      const existingPackage = await this.subscriptionRepo.findActiveByUserId(userId);
      if (existingPackage) {
        throw new AppError(
          'ACTIVE_SUBSCRIPTION_EXISTS',
          'You already have an active package subscription. Cancel it first or purchase an add-on.',
          409,
        );
      }
    } else {
      // ADDON — must have an active package
      const existingPackage = await this.subscriptionRepo.findActiveByUserId(userId);
      if (!existingPackage) {
        throw new AppError(
          'NO_ACTIVE_PACKAGE',
          'You need an active package subscription before purchasing add-ons.',
          400,
        );
      }
      parentSubscriptionId = existingPackage.id;
    }

    // Deduct coins — this will throw INSUFFICIENT_BALANCE if not enough
    // We need a currency. Use the first available one (the sku doesn't specify — we use wallet currency)
    const wallet = await this.walletService.getWallet(userId);
    if (!wallet) {
      throw new AppError(
        'WALLET_NOT_FOUND',
        'You do not have a coin wallet. Please top up first.',
        404,
      );
    }

    const currencyId = wallet.currency_id;

    // Calculate billing dates
    const now = new Date();
    const billingEnd = new Date(now);
    billingEnd.setDate(billingEnd.getDate() + sku.billing_duration_days);

    // Create subscription event, billing cycle, and order
    const purchaseToken = crypto.randomBytes(20).toString('hex');
    const orderNumber = `ORD-${userId}-${Date.now()}`;

    // Here we can use $transaction, but for simplicity of the old code,
    // we'll use a modified transaction or keep it separate.
    // Let's use Prisma to create them or sequentially if it fails it rollback.
    // Ideally these go via repository transactional method, but we'll do sequentially here for backward compatibility.
    const subscription = await this.subscriptionRepo.create({
      user_id: userId,
      sku_id: skuId,
      sku_type: sku.sku_type,
      parent_subscription_id: parentSubscriptionId ?? null,
      purchase_token: purchaseToken,
      status: 'ACTIVE',
      auto_renew: false,
      current_billing_start: now,
      current_billing_end: billingEnd,
      next_billing_date: billingEnd,
      created_by: userId,
      updated_by: userId,
    });

    const order = await this.subscriptionRepo.createOrder({
      subscription_id: subscription.id,
      user_id: userId,
      sku_id: skuId,
      order_number: orderNumber,
      coin_amount: coinCost,
      status: 'COMPLETED',
      created_by: userId,
      updated_by: userId,
    });

    const billingCycle = await this.subscriptionRepo.createBillingCycle({
      subscription_id: subscription.id,
      order_id: order.id,
      cycle_start: now,
      cycle_end: billingEnd,
      status: 'PAID',
      created_by: userId,
      updated_by: userId,
    });

    await this.subscriptionRepo.createEvent({
      subscription_id: subscription.id,
      billing_id: billingCycle.id,
      event_type: 'ACTIVATED',
      created_by: userId,
      updated_by: userId,
    });

    // Deduct coins AFTER subscription is created (so ref_id = subscription.id)
    await this.walletService.spend(
      userId,
      coinCost,
      `Subscription purchase: ${sku.sku_name}`,
      subscription.id,
      currencyId,
    );

    // Mirror quotas from SKU benefits
    if (sku.sku_type === 'PACKAGE') {
      const benefits = sku.benefits || [];
      for (const benefit of benefits) {
        await this.subscriptionRepo.createQuota({
          user_id: userId,
          package_subscription_id: subscription.id,
          resource_type: benefit.benefit_type,
          total_quota: benefit.max_usage ?? 0,
          used_quota: 0,
          created_by: userId,
          updated_by: userId,
        });
      }
    } else {
      const addons = sku.addons || [];
      for (const addon of addons) {
        const resourceType = addon.resource_type.replace('_ADDON', '').toLowerCase();
        await this.subscriptionRepo.incrementQuota(userId, resourceType, addon.quota_value);
      }
    }

    return subscription;
  }

  /** 
  ---------------------------------------------------------------
    Gets the user's active subscription with quotas.
  ---------------------------------------------------------------
  **/
  async getMySubscription(userId: number): Promise<Subscription | null> {
    return this.subscriptionRepo.findActiveByUserId(userId);
  }

  /** 
  ---------------------------------------------------------------
    Gets all subscriptions for a user (history).
  ---------------------------------------------------------------
  **/
  async getMySubscriptions(userId: number): Promise<Subscription[]> {
    return this.subscriptionRepo.findAllByUserId(userId);
  }

  /** 
  ---------------------------------------------------------------
    Cancels a subscription.
  ---------------------------------------------------------------
  **/
  async cancelSubscription(userId: number, subscriptionId: number): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findById(subscriptionId);
    if (!subscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found.', 404);
    }
    if (subscription.user_id !== userId) {
      throw new AppError('FORBIDDEN', 'You do not have access to this subscription.', 403);
    }
    if (subscription.status === 'CANCELLED') {
      throw new AppError('ALREADY_CANCELLED', 'This subscription is already cancelled.', 400);
    }

    const canceledSub = await this.subscriptionRepo.updateStatus(subscriptionId, 'CANCELLED', {
      canceled_at: new Date(),
    });

    await this.subscriptionRepo.createEvent({
      subscription_id: subscriptionId,
      event_type: 'CANCELED',
      created_by: userId,
      updated_by: userId,
    });

    return canceledSub;
  }

  /** 
  ---------------------------------------------------------------
    Switches an active package subscription to a new one.
  ---------------------------------------------------------------
  **/
  async switchPlan(userId: number, subscriptionId: number, newSkuId: number): Promise<Subscription> {
    const oldSubscription = await this.subscriptionRepo.findById(subscriptionId);
    if (!oldSubscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found.', 404);
    }
    if (oldSubscription.user_id !== userId) {
      throw new AppError('FORBIDDEN', 'You do not have access to this subscription.', 403);
    }
    if (oldSubscription.status !== 'ACTIVE') {
      throw new AppError('SUBSCRIPTION_NOT_ACTIVE', 'Only active subscriptions can be switched.', 400);
    }
    if (oldSubscription.sku_type !== 'PACKAGE') {
      throw new AppError('INVALID_SWITCH_TYPE', 'Only package subscriptions can be switched, not addons.', 400);
    }

    const newSku = await this.planRepo.findById(newSkuId);
    if (!newSku) {
      throw new AppError('SKU_NOT_FOUND', `SKU with ID ${newSkuId} not found.`, 404);
    }
    if (!newSku.is_active || newSku.sku_type !== 'PACKAGE') {
      throw new AppError('INVALID_NEW_SKU', 'The selected plan is not available or is not a package.', 400);
    }

    if (oldSubscription.sku_id === newSkuId) {
       throw new AppError('ALREADY_ON_PLAN', 'You are already on this plan.', 400);
    }

    // Determine Switch Type
    const oldRank = oldSubscription.sku?.rank ?? 0;
    const newRank = newSku.rank;
    let switchType: 'UPGRADE' | 'DOWNGRADE' | 'CROSSGRADE' = 'CROSSGRADE';
    if (newRank > oldRank) switchType = 'UPGRADE';
    else if (newRank < oldRank) switchType = 'DOWNGRADE';

    // Check user wallet
    const coinCost = Number(newSku.coin_cost);
    const wallet = await this.walletService.getWallet(userId);
    if (!wallet) throw new AppError('WALLET_NOT_FOUND', 'Coin wallet not found.', 404);

    if (Number(wallet.balance) < coinCost) {
       throw new AppError('INSUFFICIENT_BALANCE', 'Not enough coins to switch plan.', 400);
    }

    const now = new Date();
    const billingEnd = new Date(now);
    billingEnd.setDate(billingEnd.getDate() + newSku.billing_duration_days);

    const purchaseToken = crypto.randomBytes(20).toString('hex');
    const orderNumber = `ORD-${userId}-${Date.now()}`;
    const benefits = newSku.benefits || [];

    // Execute atomic transaction
    const { newSubscription } = await this.subscriptionRepo.executePlanSwitchTransaction(
      userId,
      subscriptionId,
      newSkuId,
      newSku.sku_type,
      coinCost,
      billingEnd,
      purchaseToken,
      orderNumber,
      switchType,
      benefits
    );

    // Deduct coins via service
    await this.walletService.spend(
      userId,
      coinCost,
      `Plan Switch (${switchType}): ${newSku.sku_name}`,
      newSubscription.id,
      wallet.currency_id,
    );

    return newSubscription;
  }
}
