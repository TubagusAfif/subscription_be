import {
  PrismaClient,
  Prisma,
  Subscription,
  SubscriptionQuota,
  AddonSlotMap,
  Order,
  SubscriptionEvent,
  BillingCycle,
  PlanSwitch,
} from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing Subscription database operations.
---------------------------------------------------------------
**/
export class ClientSubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.SubscriptionUncheckedCreateInput): Promise<Subscription> {
    return this.prisma.subscription.create({ data });
  }

  async findActiveByUserId(userId: number): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['ACTIVE', 'RENEWED'] },
        sku_type: 'PACKAGE',
        deleted_at: null,
      },
      include: {
        sku: { include: { benefits: true, features: true, addons: true } },
        quotas: true,
        child_subscriptions: {
          where: { deleted_at: null, status: 'ACTIVE' },
          include: { sku: true },
        },
      },
    });
  }

  async findById(id: number): Promise<Prisma.SubscriptionGetPayload<{
    include: {
      sku: { include: { benefits: true, features: true, addons: true } },
      quotas: true,
    }
  }> | null> {
    return this.prisma.subscription.findUnique({
      where: { id, deleted_at: null },
      include: {
        sku: { include: { benefits: true, features: true, addons: true } },
        quotas: true,
      },
    });
  }

  async findAllByUserId(userId: number): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: { user_id: userId, deleted_at: null },
      include: { sku: true, quotas: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateStatus(
    id: number,
    status: Prisma.SubscriptionUpdateInput['status'],
    extra?: Omit<Prisma.SubscriptionUpdateInput, 'status'>,
  ): Promise<Subscription> {
    const dataToUpdate: Prisma.SubscriptionUpdateInput = {};
    if (status !== undefined) {
      dataToUpdate.status = status;
    }
    if (extra && extra.canceled_at !== undefined) {
      dataToUpdate.canceled_at = extra.canceled_at;
    }
    return this.prisma.subscription.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async createQuota(
    data: Prisma.SubscriptionQuotaUncheckedCreateInput,
  ): Promise<SubscriptionQuota> {
    return this.prisma.subscriptionQuota.create({ data });
  }

  async createOrder(data: Prisma.OrderUncheckedCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  async incrementQuota(userId: number, resourceType: string, amount: number): Promise<void> {
    await this.prisma.subscriptionQuota.updateMany({
      where: {
        user_id: userId,
        resource_type: resourceType,
        deleted_at: null,
      },
      data: {
        total_quota: { increment: amount },
        last_recalculated_at: new Date(),
      },
    });
  }

  async incrementUsedQuota(userId: number, resourceType: string, amount: number): Promise<void> {
    await this.prisma.subscriptionQuota.updateMany({
      where: {
        user_id: userId,
        resource_type: resourceType,
        deleted_at: null,
      },
      data: {
        used_quota: { increment: amount },
        last_recalculated_at: new Date(),
      },
    });
  }

  async findQuotaByUserAndType(
    userId: number,
    resourceType: string,
  ): Promise<SubscriptionQuota | null> {
    return this.prisma.subscriptionQuota.findFirst({
      where: { user_id: userId, resource_type: resourceType, deleted_at: null },
    });
  }

  async createEvent(data: Prisma.SubscriptionEventUncheckedCreateInput): Promise<SubscriptionEvent> {
    return this.prisma.subscriptionEvent.create({ data });
  }

  async createBillingCycle(data: Prisma.BillingCycleUncheckedCreateInput): Promise<BillingCycle> {
    return this.prisma.billingCycle.create({ data });
  }

  async createPlanSwitch(data: Prisma.PlanSwitchUncheckedCreateInput): Promise<PlanSwitch> {
    return this.prisma.planSwitch.create({ data });
  }

  // Atomically switches a plan: cancels old, creates new, creates event, billing cycle, switch record, orders, and quotas.
  async executePlanSwitchTransaction(
     userId: number,
     oldSubscriptionId: number,
     newSkuId: number,
     newSkuType: any,
     coinCost: number,
     billingEnd: Date,
     purchaseToken: string,
     orderNumber: string,
     switchType: any,
     benefits: any[],
  ): Promise<{ newSubscription: Subscription; planSwitch: PlanSwitch }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Cancel Old Subscription
      await tx.subscription.update({
        where: { id: oldSubscriptionId },
        data: { status: 'CANCELLED', canceled_at: new Date() },
      });

      // 2. Create Event for Cancellation
      await tx.subscriptionEvent.create({
        data: {
          subscription_id: oldSubscriptionId,
          event_type: 'CANCELED',
          created_by: userId,
          updated_by: userId,
        },
      });

      // 3. Create New Subscription
      const newSubscription = await tx.subscription.create({
        data: {
          user_id: userId,
          sku_id: newSkuId,
          sku_type: newSkuType,
          parent_subscription_id: null, // Assuming root package
          purchase_token: purchaseToken,
          status: 'ACTIVE',
          auto_renew: false,
          current_billing_start: new Date(),
          current_billing_end: billingEnd,
          next_billing_date: billingEnd,
          created_by: userId,
          updated_by: userId,
        },
      });

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          subscription_id: newSubscription.id,
          user_id: userId,
          sku_id: newSkuId,
          order_number: orderNumber,
          coin_amount: coinCost,
          status: 'COMPLETED',
          created_by: userId,
          updated_by: userId,
        },
      });

      // 5. Create Billing Cycle
      const billingCycle = await tx.billingCycle.create({
        data: {
          subscription_id: newSubscription.id,
          order_id: order.id,
          cycle_start: new Date(),
          cycle_end: billingEnd,
          status: 'PAID',
          created_by: userId,
          updated_by: userId,
        },
      });

      // 6. Create Event for Activation
      await tx.subscriptionEvent.create({
        data: {
          subscription_id: newSubscription.id,
          billing_id: billingCycle.id,
          event_type: 'ACTIVATED',
          created_by: userId,
          updated_by: userId,
        },
      });

      // 7. Get old SKU ID to create PlanSwitch
      const oldSub = await tx.subscription.findUnique({ where: { id: oldSubscriptionId }});
      
      const planSwitch = await tx.planSwitch.create({
        data: {
          user_id: userId,
          old_subscription_id: oldSubscriptionId,
          new_subscription_id: newSubscription.id,
          old_sku_id: oldSub!.sku_id,
          new_sku_id: newSkuId,
          switch_type: switchType,
          prorated_amount: 0, // Simplified, maybe calculated correctly in service layer later
          status: 'COMPLETED',
          created_by: userId,
          updated_by: userId,
        },
      });

      // 8. Create Event for Plan Switch (associate with new sub)
      await tx.subscriptionEvent.create({
        data: {
          subscription_id: newSubscription.id,
          event_type: 'PLAN_SWITCHED',
          created_by: userId,
          updated_by: userId,
        },
      });

      // 9. Create Quotas for new plan
      for (const benefit of benefits) {
        await tx.subscriptionQuota.create({
           data: {
             user_id: userId,
             package_subscription_id: newSubscription.id,
             resource_type: benefit.benefit_type,
             total_quota: benefit.max_usage ?? 0,
             used_quota: 0,
             created_by: userId,
             updated_by: userId,
           }
        });
      }

      // Hide or transfer old quotas? For simplicity, we create fresh quotas for the new plan.
      // Old quotas belong to old subscription which is now CANCELLED.
      
      return { newSubscription, planSwitch };
    });
  }
}
