import { AppError } from '../../shared/middlewares/error.middleware';
import { CoinWalletRepository } from '../repositories/coin-wallet.repository';
import { CoinTransactionRepository } from '../repositories/coin-transaction.repository';
import { CoinWallet, CoinTransaction } from '@prisma/client';

export interface CoinWalletServiceDeps {
  coinWalletRepository: CoinWalletRepository;
  coinTransactionRepository: CoinTransactionRepository;
}

/** 
---------------------------------------------------------------
  Service for wallet balance management and coin spending.
---------------------------------------------------------------
**/
export class CoinWalletService {
  private readonly walletRepo: CoinWalletRepository;
  private readonly transactionRepo: CoinTransactionRepository;

  constructor(deps: CoinWalletServiceDeps) {
    this.walletRepo = deps.coinWalletRepository;
    this.transactionRepo = deps.coinTransactionRepository;
  }

  /** 
  ---------------------------------------------------------------
    Gets the user's wallet, returns null if not yet created.
  ---------------------------------------------------------------
  **/
  async getWallet(userId: number): Promise<CoinWallet | null> {
    return this.walletRepo.findByUserId(userId);
  }

  /** 
  ---------------------------------------------------------------
    Gets all transactions for a user.
  ---------------------------------------------------------------
  **/
  async getTransactions(userId: number): Promise<CoinTransaction[]> {
    return this.transactionRepo.findByUserId(userId);
  }

  /** 
  ---------------------------------------------------------------
    Spends coins from the user's wallet. Throws if insufficient.
  ---------------------------------------------------------------
  **/
  async spend(
    userId: number,
    amount: number,
    description: string,
    refId: number,
    currencyId: number,
  ): Promise<CoinTransaction> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      throw new AppError(
        'WALLET_NOT_FOUND',
        'You do not have a coin wallet. Please top up first.',
        404,
      );
    }

    if (Number(wallet.balance) < amount) {
      throw new AppError(
        'INSUFFICIENT_BALANCE',
        `Insufficient coin balance. Required: ${amount}, Available: ${Number(wallet.balance)}`,
        400,
      );
    }

    // Deduct balance
    await this.walletRepo.deductBalance(userId, amount);

    // Record SPEND transaction
    return this.transactionRepo.create({
      wallet_id: wallet.id,
      user_id: userId,
      type: 'SPEND',
      amount,
      currency_id: currencyId,
      ref_id: refId,
      description,
      created_by: userId,
      updated_by: userId,
    });
  }
}
