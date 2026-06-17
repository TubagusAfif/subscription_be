import { PrismaClient } from '@prisma/client';

export class AdminSubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSubscriptionStats(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    const [total, active, cancelled, expired] = await Promise.all([
      this.prisma.subscription.count({
        where: { deleted_at: null, ...dateFilter },
      }),
      this.prisma.subscription.count({
        where: {
          deleted_at: null,
          status: { in: ['ACTIVE', 'RENEWED'] },
          ...dateFilter,
        },
      }),
      this.prisma.subscription.count({
        where: { deleted_at: null, status: 'CANCELLED', ...dateFilter },
      }),
      this.prisma.subscription.count({
        where: { deleted_at: null, status: 'EXPIRED', ...dateFilter },
      }),
    ]);

    return {
      total_subscriptions: total,
      active_subscriptions: active,
      cancelled_subscriptions: cancelled,
      expired_subscriptions: expired,
    };
  }

  async getPlanDistribution(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    const activeSubs = await this.prisma.subscription.findMany({
      where: {
        deleted_at: null,
        status: { in: ['ACTIVE', 'RENEWED'] },
        ...dateFilter,
      },
      select: {
        sku_id: true,
        sku: {
          select: {
            sku_name: true,
            package_tier: true,
          },
        },
      },
    });

    const distributionMap = new Map<
      number,
      { plan_name: string; plan_tier: string | null; active_count: number }
    >();

    for (const sub of activeSubs) {
      const existing = distributionMap.get(sub.sku_id);
      if (existing) {
        existing.active_count += 1;
      } else {
        distributionMap.set(sub.sku_id, {
          plan_name: sub.sku.sku_name,
          plan_tier: sub.sku.package_tier,
          active_count: 1,
        });
      }
    }

    return Array.from(distributionMap.values());
  }

  async getRecentSubscriptions(limit: number, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    return this.prisma.subscription.findMany({
      where: { deleted_at: null, ...dateFilter },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        sku: {
          select: { id: true, sku_name: true, package_tier: true },
        },
      },
    });
  }
}
