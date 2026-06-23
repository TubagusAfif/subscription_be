import { PrismaClient, Prisma } from '@prisma/client';

export class InternalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findSubscriptionByToken(purchaseToken: string, tx?: Prisma.TransactionClient) {
    const db = tx || this.prisma;
    return db.subscription.findFirst({
      where: {
        purchase_token: purchaseToken,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });
  }

  async findSubscriptionByTokenAnyStatus(purchaseToken: string, tx?: Prisma.TransactionClient) {
    const db = tx || this.prisma;
    return db.subscription.findFirst({
      where: {
        purchase_token: purchaseToken,
        deleted_at: null,
      },
    });
  }

  async getQuotaWithLock(subscriptionId: number, resourceType: string, tx: Prisma.TransactionClient) {
    return tx.$queryRaw<Array<{ id: number; total_quota: number; used_quota: number }>>`
      SELECT id, total_quota, used_quota
      FROM subscription_quotas
      WHERE package_subscription_id = ${subscriptionId}
        AND resource_type = ${resourceType}
        AND deleted_at IS NULL
      FOR UPDATE
    `;
  }

  async incrementQuotaUsed(quotaId: number, tx: Prisma.TransactionClient) {
    return tx.subscriptionQuota.update({
      where: { id: quotaId },
      data: { used_quota: { increment: 1 } },
    });
  }

  async decrementQuotaUsed(quotaId: number, tx: Prisma.TransactionClient) {
    return tx.subscriptionQuota.update({
      where: { id: quotaId },
      data: { used_quota: { decrement: 1 } },
    });
  }

  async createAddonSlotMap(data: Prisma.AddonSlotMapUncheckedCreateInput, tx: Prisma.TransactionClient) {
    return tx.addonSlotMap.create({ data });
  }

  async findAddonSlotMap(subscriptionId: number, refId: number, refType?: string | string[], tx?: Prisma.TransactionClient) {
    const db = tx || this.prisma;
    const slotMapWhere: Prisma.AddonSlotMapWhereInput = {
      addon_subscription_id: subscriptionId,
      ref_id: refId,
      deleted_at: null,
    };
    if (refType) {
      slotMapWhere.ref_type = Array.isArray(refType) ? { in: refType } : refType;
    }
    return db.addonSlotMap.findFirst({
      where: slotMapWhere,
    });
  }

  async softDeleteAddonSlotMap(id: number, tx: Prisma.TransactionClient) {
    return tx.addonSlotMap.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async findQuota(subscriptionId: number, resourceType: string, tx?: Prisma.TransactionClient) {
    const db = tx || this.prisma;
    return db.subscriptionQuota.findFirst({
      where: {
        package_subscription_id: subscriptionId,
        resource_type: resourceType,
        deleted_at: null,
      },
    });
  }

  async getSubscriptionSnapshot(purchaseToken: string) {
    return this.prisma.subscription.findFirst({
      where: {
        purchase_token: purchaseToken,
        deleted_at: null,
      },
      include: {
        sku: {
          include: {
            benefits: { where: { deleted_at: null } },
            features: { where: { deleted_at: null, is_active: true } },
            addons: { where: { deleted_at: null } },
          },
        },
        quotas: { where: { deleted_at: null } },
        child_subscriptions: {
          where: { deleted_at: null, sku_type: 'ADDON' },
          include: {
            sku: { include: { addons: { where: { deleted_at: null } } } },
          },
        },
      },
    });
  }

  async getQuotaDetails(purchaseToken: string, resourceType: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { purchase_token: purchaseToken, deleted_at: null },
      include: { quotas: { where: { resource_type: resourceType, deleted_at: null } } },
    });
    return subscription?.quotas?.[0];
  }
}
