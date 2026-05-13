import { Router, RequestHandler } from 'express';
import { createSharedAuthRouter } from './auth.routes';
import { createUploadRouter } from './upload.routes';
import { createWebhookRouter } from './webhook.routes';
import { createAccountRouter } from './account.routes';
import { SharedAuthController } from '../controllers/auth.controller';
import { UploadController } from '../controllers/upload.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { AccountController } from '../controllers/account.controller';

export const createSharedRouter = (
  authController: SharedAuthController,
  uploadController: UploadController,
  webhookController: WebhookController,
  accountController: AccountController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.use('/auth', createSharedAuthRouter(authController, authenticate));
  router.use('/upload', createUploadRouter(uploadController, authenticate));
  router.use('/webhook', createWebhookRouter(webhookController));
  router.use('/account', createAccountRouter(accountController, authenticate));

  return router;
};
