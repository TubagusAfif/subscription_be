import { Router } from 'express';
import { ClientAuthController } from '../controllers/auth.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { authLimiter } from '../../shared/middlewares/rate-limit.middleware';
import { registerSchema, loginSchema, activateSchema, forgotPasswordSchema, resetPasswordSchema, resendActivationSchema } from '../../shared/validations/auth.validation';

export const createClientAuthRouter = (controller: ClientAuthController): Router => {
  const router = Router();

  router.post('/register', authLimiter, validate(registerSchema), controller.register);
  router.post('/login', authLimiter, validate(loginSchema), controller.login);
  router.post('/activate', validate(activateSchema), controller.activate);
  router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
  router.post('/reset-password', authLimiter, validate(resetPasswordSchema), controller.resetPassword);
  router.post('/resend-activation', authLimiter, validate(resendActivationSchema), controller.resendActivation);
  return router;
};
