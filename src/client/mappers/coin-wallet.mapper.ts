import { CoinWallet, CoinTransaction } from '@prisma/client';

export class CoinWalletMapper {
  static toWalletResponse(wallet: CoinWallet) {
    return {
      id: wallet.id,
      user_id: wallet.user_id,
      balance: Number(wallet.balance),
      currency_id: wallet.currency_id,
      last_updated: wallet.last_updated,
      created_at: wallet.created_at,
    };
  }

  static toTransactionResponse(tx: CoinTransaction) {
    return {
      id: tx.id,
      wallet_id: tx.wallet_id,
      user_id: tx.user_id,
      type: tx.type,
      amount: Number(tx.amount),
      currency_id: tx.currency_id,
      conversion_rate_snapshot: Number(tx.conversion_rate_snapshot),
      ref_id: tx.ref_id,
      description: tx.description,
      created_at: tx.created_at,
    };
  }
}
