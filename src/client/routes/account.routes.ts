import { Router, RequestHandler } from 'express';
import { ClientAccountController } from '../controllers/account.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { updateAccountSchema, changePasswordSchema } from '../../shared/validations/account.validation';

export const createClientAccountRouter = (
  controller: ClientAccountController,
  authenticate: RequestHandler
): Router => {
  const router = Router();

  router.use(authenticate);

  router.get('/me', controller.getMe);
  router.put('/me', validate(updateAccountSchema), controller.updateMe);
  router.patch('/password', validate(changePasswordSchema), controller.changePassword);

  return router;
};
