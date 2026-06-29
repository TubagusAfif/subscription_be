import { Router, RequestHandler } from 'express';
import { ClientSubscriptionController } from '../controllers/subscription.controller';
import { authorize } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import {
  subscribeSchema,
  cancelSubscriptionSchema,
  switchPlanSchema,
} from '../../shared/validations/subscription.validation';

export const createSubscriptionRouter = (
  subscriptionController: ClientSubscriptionController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use(authenticate, authorize(['OWNER']));

  router.post('/', validate(subscribeSchema), subscriptionController.subscribe);
  router.get('/', subscriptionController.getMySubscription);
  router.get('/all', subscriptionController.getMySubscriptions);
  router.post(
    '/:id/cancel',
    validate(cancelSubscriptionSchema),
    subscriptionController.cancelSubscription,
  );
  router.post('/:id/switch', validate(switchPlanSchema), subscriptionController.switchPlan);

  return router;
};
