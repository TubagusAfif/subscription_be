import { Router, RequestHandler } from 'express';
import { createSharedAuthRouter } from './auth.routes';
import { createUploadRouter } from './upload.routes';
import { createAccountRouter } from './account.routes';
import { SharedAuthController } from '../controllers/auth.controller';
import { UploadController } from '../controllers/upload.controller';
import { AccountController } from '../controllers/account.controller';

export const createSharedRouter = (
  authController: SharedAuthController,
  uploadController: UploadController,
  accountController: AccountController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use('/auth', createSharedAuthRouter(authController, authenticate));
  router.use('/upload', createUploadRouter(uploadController, authenticate));
  router.use('/account', createAccountRouter(accountController, authenticate));

  return router;
};
