import { Router, RequestHandler } from 'express';
import { PaymentMethodController } from '../controllers/payment-method.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  getPaymentMethodSchema,
  deletePaymentMethodSchema,
} from '../../shared/validations/payment-method.validation';

export const createPaymentMethodRouter = (
  paymentMethodController: PaymentMethodController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use(authenticate);

  router.get(
    '/active',
    authorize(['ADMIN', 'SUPERADMIN']),
    paymentMethodController.getActivePaymentMethods,
  );

  // All payment method configuration endpoints require SUPERADMIN role
  router.use(authorize(['SUPERADMIN']));

  router.post(
    '/',
    validate(createPaymentMethodSchema),
    paymentMethodController.createPaymentMethod,
  );
  router.get('/', paymentMethodController.getAllPaymentMethods);
  router.get(
    '/:id',
    validate(getPaymentMethodSchema),
    paymentMethodController.getPaymentMethodById,
  );
  router.put(
    '/:id',
    validate(updatePaymentMethodSchema),
    paymentMethodController.updatePaymentMethod,
  );
  router.delete(
    '/:id',
    validate(deletePaymentMethodSchema),
    paymentMethodController.removePaymentMethod,
  );

  return router;
};
