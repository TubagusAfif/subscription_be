import { Router, RequestHandler } from 'express';
import { SharedCurrencyController } from '../../shared/controllers/currency.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';

export const createClientCurrencyRouter = (currencyController: SharedCurrencyController, authenticate: RequestHandler): Router => {
  const router = Router();

  router.use(authenticate, authorize(['OWNER']));

  router.get('/active', currencyController.getActiveCurrency);

  return router;
};
