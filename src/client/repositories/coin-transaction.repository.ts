import { PrismaClient, Prisma, CoinTransaction } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing Coin Transaction log entries.
---------------------------------------------------------------
**/
export class CoinTransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.CoinTransactionUncheckedCreateInput): Promise<CoinTransaction> {
    return this.prisma.coinTransaction.create({ data });
  }

  async findByUserId(userId: number): Promise<CoinTransaction[]> {
    return this.prisma.coinTransaction.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findRecentByUserId(userId: number, limit: number = 5) {
    return this.prisma.coinTransaction.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getRevenueStats(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    const [topupAgg, spendAgg] = await Promise.all([
      this.prisma.coinTransaction.aggregate({
        _sum: { amount: true },
        where: { deleted_at: null, type: 'TOPUP', ...dateFilter },
      }),
      this.prisma.coinTransaction.aggregate({
        _sum: { amount: true },
        where: { deleted_at: null, type: 'SPEND', ...dateFilter },
      }),
    ]);

    return {
      total_coins_purchased: topupAgg._sum.amount,
      total_coins_spent: spendAgg._sum.amount,
    };
  }

  async findByWalletId(walletId: number): Promise<CoinTransaction[]> {
    return this.prisma.coinTransaction.findMany({
      where: { wallet_id: walletId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }
}
