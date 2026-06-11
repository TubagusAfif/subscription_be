import { Router, RequestHandler } from 'express';
import { SharedTaxController } from '../../shared/controllers/tax.controller';

export const createClientTaxRouter = (
  sharedTaxController: SharedTaxController,
  authenticate: RequestHandler
): Router => {
  const router = Router();

  // Client tax endpoints (e.g. fetching active tax for checkout calculation)
  router.use(authenticate);

  router.get('/active', sharedTaxController.getActiveTax);

  return router;
};
