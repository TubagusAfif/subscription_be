import { PrismaClient, Prisma, CoinWallet } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing Coin Wallet database operations.
---------------------------------------------------------------
**/
export class CoinWalletRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: number): Promise<CoinWallet | null> {
    return this.prisma.coinWallet.findUnique({
      where: { user_id: userId, deleted_at: null },
    });
  }

  async create(data: Prisma.CoinWalletUncheckedCreateInput): Promise<CoinWallet> {
    return this.prisma.coinWallet.create({ data });
  }

  async addBalance(userId: number, amount: number): Promise<CoinWallet> {
    return this.prisma.coinWallet.update({
      where: { user_id: userId },
      data: {
        balance: { increment: amount },
        last_updated: new Date(),
      },
    });
  }

  async deductBalance(userId: number, amount: number): Promise<CoinWallet> {
    return this.prisma.coinWallet.update({
      where: { user_id: userId },
      data: {
        balance: { decrement: amount },
        last_updated: new Date(),
      },
    });
  }
}
