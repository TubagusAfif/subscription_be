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

  async findByWalletId(walletId: number): Promise<CoinTransaction[]> {
    return this.prisma.coinTransaction.findMany({
      where: { wallet_id: walletId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }
}
