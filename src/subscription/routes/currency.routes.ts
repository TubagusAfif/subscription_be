import { Router, RequestHandler } from 'express';
import { CurrencyController } from '../controllers/currency.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createCurrencySchema,
  updateCurrencySchema,
  getCurrencySchema,
  deleteCurrencySchema,
  activateCurrencySchema,
} from '../../shared/validations/coin.validation';

export const createCurrencyRouter = (
  currencyController: CurrencyController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  // All currency master data endpoints require ADMIN or OWNER roles
  router.use(authenticate, authorize(['SUPERADMIN']));

  router.post('/', validate(createCurrencySchema), currencyController.createCurrency);
  router.get('/', currencyController.getAllCurrencies);
  router.get('/active', currencyController.getActiveCurrency);
  router.get('/:id', validate(getCurrencySchema), currencyController.getCurrencyById);
  router.put('/:id', validate(updateCurrencySchema), currencyController.updateCurrency);
  router.delete('/:id', validate(deleteCurrencySchema), currencyController.removeCurrency);
  router.patch(
    '/:id/activate',
    validate(activateCurrencySchema),
    currencyController.activateCurrency,
  );

  return router;
};
