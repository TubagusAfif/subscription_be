import { Response, NextFunction } from 'express';
import { CoinWalletService } from '../services/coin-wallet.service';
import { CoinWalletMapper } from '../mappers/coin-wallet.mapper';
import { successResponse } from '../../shared/utils/response.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';

export interface CoinWalletControllerDeps {
  coinWalletService: CoinWalletService;
}

export class CoinWalletController {
  private readonly coinWalletService: CoinWalletService;

  constructor(deps: CoinWalletControllerDeps) {
    this.coinWalletService = deps.coinWalletService;
  }

  getMyWallet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const wallet = await this.coinWalletService.getWallet(Number(req.user.sub));
      res.status(200).json(
        successResponse(wallet ? CoinWalletMapper.toWalletResponse(wallet) : null),
      );
    } catch (error) {
      next(error);
    }
  };

  getMyTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transactions = await this.coinWalletService.getTransactions(Number(req.user.sub));
      res.status(200).json(
        successResponse(transactions.map((t) => CoinWalletMapper.toTransactionResponse(t))),
      );
    } catch (error) {
      next(error);
    }
  };
}
