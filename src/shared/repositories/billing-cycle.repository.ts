import { PrismaClient, Prisma, BillingCycle } from '@prisma/client';

export class BillingCycleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.BillingCycleUncheckedCreateInput): Promise<BillingCycle> {
    return this.prisma.billingCycle.create({ data });
  }

  async findRecentByUserId(userId: number, limit: number = 5) {
    return this.prisma.billingCycle.findMany({
      where: {
        subscription: {
          user_id: userId,
          deleted_at: null,
        },
        deleted_at: null,
      },
      include: {
        subscription: {
          include: { sku: true },
        },
      },
      orderBy: { cycle_start: 'desc' },
      take: limit,
    });
  }
}
