import { Router, RequestHandler } from 'express';
import { AccountController } from '../controllers/account.controller';
import { validate } from '../middlewares/validate.middleware';
import { updateAccountSchema, changePasswordSchema } from '../validations/account.validation';

export const createAccountRouter = (
  controller: AccountController,
  authenticate: RequestHandler
): Router => {
  const router = Router();

  router.use(authenticate);

  router.get('/me', controller.getMe);
  router.put('/me', validate(updateAccountSchema), controller.updateMe);
  router.patch('/password', validate(changePasswordSchema), controller.changePassword);

  return router;
};
