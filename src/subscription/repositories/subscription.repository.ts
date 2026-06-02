import { PrismaClient } from '@prisma/client';

export class AdminSubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSubscriptionStats() {
    const [total, active, cancelled, expired] = await Promise.all([
      this.prisma.subscription.count({
        where: { deleted_at: null },
      }),
      this.prisma.subscription.count({
        where: {
          deleted_at: null,
          status: { in: ['ACTIVE', 'RENEWED'] },
        },
      }),
      this.prisma.subscription.count({
        where: { deleted_at: null, status: 'CANCELLED' },
      }),
      this.prisma.subscription.count({
        where: { deleted_at: null, status: 'EXPIRED' },
      }),
    ]);

    return {
      total_subscriptions: total,
      active_subscriptions: active,
      cancelled_subscriptions: cancelled,
      expired_subscriptions: expired,
    };
  }

  async getPlanDistribution() {
    const activeSubs = await this.prisma.subscription.findMany({
      where: {
        deleted_at: null,
        status: { in: ['ACTIVE', 'RENEWED'] },
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

  async getRecentSubscriptions(limit: number) {
    return this.prisma.subscription.findMany({
      where: { deleted_at: null },
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
