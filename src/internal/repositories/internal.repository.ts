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

  async getQuotaWithLock(
    subscriptionId: number,
    resourceType: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.$queryRaw<
      Array<{ id: number; total_quota: number; used_quota: number; is_unlimited: boolean }>
    >`
      SELECT id, total_quota, used_quota, is_unlimited
      FROM subscription_quotas
      WHERE package_subscription_id = ${subscriptionId}
        AND resource_type = ${resourceType}
        AND deleted_at IS NULL
      FOR UPDATE
    `;
  }

  /**
   * Ordered capacity sources for a resource, package first then active add-ons
   * oldest-first. This ordering is the "first N slots belong to the package,
   * the rest to add-ons" rule — assignment attributes each slot to the first
   * source in this list that still has room, and persists that on the slot map
   * so add-on expiry can revoke exactly the slots it provided.
   */
  async getAssignmentSources(
    subscriptionId: number,
    userId: number,
    quotaResourceType: string,
    tx: Prisma.TransactionClient,
  ): Promise<Array<{ subscriptionId: number; capacity: number; is_unlimited: boolean }>> {
    const addonResourceType = quotaResourceType === 'clinic' ? 'CLINIC_ADDON' : 'USER_ADDON';

    const [packageSub, addonSubs] = await Promise.all([
      tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: { sku: { include: { benefits: { where: { deleted_at: null } } } } },
      }),
      tx.subscription.findMany({
        where: { user_id: userId, sku_type: 'ADDON', status: 'ACTIVE', deleted_at: null },
        orderBy: { created_at: 'asc' },
        include: { sku: { include: { addons: { where: { deleted_at: null } } } } },
      }),
    ]);

    const sources: Array<{ subscriptionId: number; capacity: number; is_unlimited: boolean }> = [];

    if (packageSub?.sku) {
      const benefit = packageSub.sku.benefits.find((b) => b.benefit_type === quotaResourceType);
      sources.push({
        subscriptionId: packageSub.id,
        capacity: benefit?.max_usage ?? 0,
        is_unlimited: benefit?.is_unlimited ?? false,
      });
    }

    for (const addonSub of addonSubs) {
      const matching = addonSub.sku.addons.filter((a) => a.resource_type === addonResourceType);
      if (matching.length === 0) continue;
      sources.push({
        subscriptionId: addonSub.id,
        capacity: matching.reduce((sum, a) => sum + a.quota_value, 0),
        is_unlimited: matching.some((a) => a.is_unlimited),
      });
    }

    return sources;
  }

  /** Count of live (non-deleted) slots attributed to each source subscription,
   *  restricted to the given ref types (clinic, or staff+doctor for users). */
  async countSlotsBySource(
    subscriptionIds: number[],
    refTypes: string[],
    tx: Prisma.TransactionClient,
  ): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (subscriptionIds.length === 0) return counts;

    const rows = await tx.addonSlotMap.groupBy({
      by: ['addon_subscription_id'],
      where: {
        addon_subscription_id: { in: subscriptionIds },
        ref_type: { in: refTypes },
        deleted_at: null,
      },
      _count: { _all: true },
    });
    for (const row of rows) counts.set(row.addon_subscription_id, row._count._all);
    return counts;
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

  async createAddonSlotMap(
    data: Prisma.AddonSlotMapUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.addonSlotMap.create({ data });
  }

  async findAddonSlotMap(
    subscriptionId: number,
    refId: number,
    refType?: string | string[],
    tx?: Prisma.TransactionClient,
  ) {
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

  /**
   * Find a live slot map for a company by ref, regardless of which source
   * subscription (package or add-on) it was attributed to. Release must search
   * across all the owner's subscriptions — a slot for the 6th user lives on the
   * add-on subscription, not the package.
   */
  async findUserSlotMap(
    userId: number,
    refId: number,
    refTypes: string[],
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || this.prisma;
    return db.addonSlotMap.findFirst({
      where: {
        ref_id: refId,
        ref_type: { in: refTypes },
        deleted_at: null,
        subscription: { user_id: userId },
      },
    });
  }

  /**
   * Recompute a resource's aggregate quota from current truth: total_quota and
   * is_unlimited from the package benefit + still-ACTIVE add-ons, and used_quota
   * from the live slot maps across the owner's subscriptions. Idempotent — call
   * it after an add-on expires (once its subscription is EXPIRED and its slots
   * soft-deleted) to shrink the cap and drop the unlimited flag if it was the
   * only unlimited source.
   */
  async reconcileQuota(
    packageSubId: number,
    userId: number,
    quotaResourceType: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const sources = await this.getAssignmentSources(packageSubId, userId, quotaResourceType, tx);
    const isUnlimited = sources.some((s) => s.is_unlimited);
    const total = isUnlimited ? 0 : sources.reduce((sum, s) => sum + s.capacity, 0);

    const refTypes = quotaResourceType === 'clinic' ? ['clinic'] : ['staff', 'doctor'];
    const used = await tx.addonSlotMap.count({
      where: {
        ref_type: { in: refTypes },
        deleted_at: null,
        subscription: { user_id: userId },
      },
    });

    await tx.subscriptionQuota.updateMany({
      where: {
        package_subscription_id: packageSubId,
        resource_type: quotaResourceType,
        deleted_at: null,
      },
      data: {
        total_quota: total,
        is_unlimited: isUnlimited,
        used_quota: used,
        last_recalculated_at: new Date(),
      },
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
