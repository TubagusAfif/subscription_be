import { CoinOrderRepository } from '../repositories/coin-order.repository'
import { CoinOrder } from '@prisma/client';
import { AppError } from '../../shared/middlewares/error.middleware';


export interface CoinOrderServiceDeps {
  coinOrderRepository: CoinOrderRepository;
}

export class CoinOrderService {
  private readonly coinOrderRepo: CoinOrderRepository;

  constructor(deps: CoinOrderServiceDeps) {
    this.coinOrderRepo = deps.coinOrderRepository;
  }

  async getOrderByPgOrderId(pgOrderId: string): Promise<CoinOrder> {
    const order = await this.coinOrderRepo.findByPgOrderId(pgOrderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Coin order with Payment Gateway ID ${pgOrderId} not found.`, 404);
    }

    return order;
  }

}