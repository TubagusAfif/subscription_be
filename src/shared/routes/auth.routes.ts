import { Router, RequestHandler } from 'express';
import { SharedAuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { refreshSchema } from '../validations/auth.validation';

export const createSharedAuthRouter = (controller: SharedAuthController, authenticate: RequestHandler): Router => {
  const router = Router();

  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);

  return router;
};
