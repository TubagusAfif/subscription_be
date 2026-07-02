import { Router } from 'express';
import { CoinOrderController } from '../controllers/coin-order.controller';

export const createCoinOrderRouter = (coinOrderController: CoinOrderController): Router => {
  const router = Router();

  // Bank Mega Redirect Bridge — catches checkout return callbacks
  router.get('/:id', coinOrderController.getCoinOrderByPgId);

  return router;
};
