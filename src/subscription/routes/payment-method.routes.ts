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

  // All payment method configuration endpoints require ADMIN or OWNER roles
  router.use(authenticate, authorize(['ADMIN']));

  router.post('/', validate(createPaymentMethodSchema), paymentMethodController.createPaymentMethod);
  router.get('/', paymentMethodController.getAllPaymentMethods);
  router.get('/active', paymentMethodController.getActivePaymentMethods);
  router.get('/:id', validate(getPaymentMethodSchema), paymentMethodController.getPaymentMethodById);
  router.put('/:id', validate(updatePaymentMethodSchema), paymentMethodController.updatePaymentMethod);
  router.delete('/:id', validate(deletePaymentMethodSchema), paymentMethodController.removePaymentMethod);

  return router;
};
