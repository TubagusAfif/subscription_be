import { Router, RequestHandler } from 'express';
import { CoinOrderController } from '../controllers/coin-order.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createCoinOrderSchema,
  getCoinOrderSchema,
} from '../../shared/validations/coin-order.validation';

export const createCoinOrderRouter = (coinOrderController: CoinOrderController, authenticate: RequestHandler): Router => {
  const router = Router();

  router.use(authenticate, authorize(['OWNER']));

  router.post('/', validate(createCoinOrderSchema), coinOrderController.createOrder);
  router.get('/', coinOrderController.getMyOrders);
  router.get('/:id', validate(getCoinOrderSchema), coinOrderController.getOrderById);

  return router;
};
