import { Router, RequestHandler } from 'express';
import { SharedPaymentMethodController } from '../../shared/controllers/payment-method.controller';

export const createClientPaymentMethodRouter = (
  sharedPaymentMethodController: SharedPaymentMethodController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use(authenticate);

  router.get('/active', sharedPaymentMethodController.getActivePaymentMethods);

  return router;
};
