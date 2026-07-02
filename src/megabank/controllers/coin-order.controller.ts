import { Request, Response, NextFunction } from 'express';
import { CoinOrderService } from '../services/coin-order.service';
import { successResponse } from '../../shared/utils/response.util';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface CoinOrderControllerDeps {
  coinOrderService: CoinOrderService;
}

export class CoinOrderController {
  private readonly coinOrderService: CoinOrderService;

  constructor(deps: CoinOrderControllerDeps) {
    this.coinOrderService = deps.coinOrderService;
  }

  getCoinOrderByPgId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pgOrderId = req.params.id;
      if (typeof pgOrderId !== 'string' || !pgOrderId) {
        throw new AppError('INVALID_ORDER_ID', 'A valid payment gateway order id is required.', 400);
      }

      const data = await this.coinOrderService.getOrderByPgOrderId(pgOrderId);

      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };
}
