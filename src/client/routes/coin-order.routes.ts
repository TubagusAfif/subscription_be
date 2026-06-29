import { Router, RequestHandler } from 'express';
import { CoinOrderController } from '../controllers/coin-order.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createBundleCoinOrderSchema,
  createCoinOrderSchema,
  getCoinOrderSchema,
  getCoinOrderStatusSchema,
} from '../../shared/validations/coin-order.validation';

export const createCoinOrderRouter = (
  coinOrderController: CoinOrderController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.get(
    '/status',
    validate(getCoinOrderStatusSchema),
    coinOrderController.getOrderByPgOrderId,
  );

  router.use(authenticate, authorize(['OWNER']));

  router.post(
    '/bundle',
    validate(createBundleCoinOrderSchema),
    coinOrderController.createBundleOrder,
  );
  router.post('/', validate(createCoinOrderSchema), coinOrderController.createCoinOrder);
  router.get('/pending', coinOrderController.getPendingOrder);
  router.get('/', coinOrderController.getMyOrders);
  router.get('/:id', validate(getCoinOrderSchema), coinOrderController.getOrderById);

  return router;
};
