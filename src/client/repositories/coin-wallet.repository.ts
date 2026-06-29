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

  async findByUserIdWithCurrency(userId: number) {
    return this.prisma.coinWallet.findUnique({
      where: { user_id: userId, deleted_at: null },
      include: { currency: true },
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

  /**
   * Atomically deduct `amount` only if the current balance covers it.
   * Returns true if a row was updated (sufficient funds), false otherwise.
   * The `balance >= amount` predicate is evaluated by Postgres under the row
   * write lock, so concurrent spends cannot both succeed and overdraw.
   */
  async deductBalanceIfSufficient(userId: number, amount: number): Promise<boolean> {
    const { count } = await this.prisma.coinWallet.updateMany({
      where: { user_id: userId, balance: { gte: amount } },
      data: {
        balance: { decrement: amount },
        last_updated: new Date(),
      },
    });
    return count > 0;
  }
}
