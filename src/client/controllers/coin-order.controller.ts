import { Response, NextFunction } from 'express';
import { CoinOrderService } from '../services/coin-order.service';
import { CoinOrderMapper } from '../mappers/coin-order.mapper';
import { successResponse } from '../../shared/utils/response.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type { CreateCoinOrderBody } from '../../shared/validations/coin-order.validation';

export interface CoinOrderControllerDeps {
  coinOrderService: CoinOrderService;
}

export class CoinOrderController {
  private readonly coinOrderService: CoinOrderService;

  constructor(deps: CoinOrderControllerDeps) {
    this.coinOrderService = deps.coinOrderService;
  }

  createOrder = async (req: AuthenticatedRequest<CreateCoinOrderBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bundle_id, user_name, user_email, user_phone, payment_source } = req.body;

      const orderUser = {
        id: Number(req.user.sub),
        name: user_name || `User ${req.user.sub}`,
        email: user_email || `user${req.user.sub}@example.com`,
        phone: user_phone || '',
      };
      const result = await this.coinOrderService.createOrder(
        Number(req.user.sub),
        bundle_id,
        orderUser,
        payment_source || 'va',
      );

      res.status(201).json(
        successResponse({
          ...CoinOrderMapper.toResponse(result.order),
          checkout_url: result.checkout_url,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  getMyOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await this.coinOrderService.getUserOrders(Number(req.user.sub));
      res.status(200).json(
        successResponse(orders.map((o) => CoinOrderMapper.toResponse(o))),
      );
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.coinOrderService.getOrderById(Number(req.params.id), Number(req.user.sub));
      res.status(200).json(
        successResponse(CoinOrderMapper.toResponse(order)),
      );
    } catch (error) {
      next(error);
    }
  };
}
