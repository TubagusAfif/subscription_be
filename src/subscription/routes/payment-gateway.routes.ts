import { Router, RequestHandler } from 'express';
import { PaymentGatewayController } from '../controllers/payment-gateway.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  createPaymentGatewaySchema,
  updatePaymentGatewaySchema,
  getPaymentGatewaySchema,
  deletePaymentGatewaySchema,
} from '../../shared/validations/payment-gateway.validation';

export const createPaymentGatewayRouter = (gatewayController: PaymentGatewayController, authenticate: RequestHandler): Router => {
  const router = Router();

  // All payment gateway master data endpoints require ADMIN or OWNER roles
  router.use(authenticate, authorize(['ADMIN']));

  router.post('/', validate(createPaymentGatewaySchema), gatewayController.createGateway);
  router.get('/', gatewayController.getAllGateways);
  router.get('/:id', validate(getPaymentGatewaySchema), gatewayController.getGatewayById);
  router.put('/:id', validate(updatePaymentGatewaySchema), gatewayController.updateGateway);
  router.delete('/:id', validate(deletePaymentGatewaySchema), gatewayController.removeGateway);

  return router;
};
