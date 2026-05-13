import { Router } from 'express';
import { SubscriptionAuthController } from '../controllers/auth.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { authLimiter } from '../../shared/middlewares/rate-limit.middleware';
import { loginSchema } from '../../shared/validations/auth.validation';

export const createSubscriptionAuthRouter = (controller: SubscriptionAuthController): Router => {
  const router = Router();
  router.post('/login', authLimiter, validate(loginSchema), controller.login);
  return router;
};
