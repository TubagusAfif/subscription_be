import { Router, RequestHandler } from 'express';
import { CoinWalletController } from '../controllers/coin-wallet.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';

export const createCoinWalletRouter = (
  coinWalletController: CoinWalletController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use(authenticate, authorize(['OWNER']));

  router.get('/', coinWalletController.getMyWallet);
  router.get('/transactions', coinWalletController.getMyTransactions);

  return router;
};
