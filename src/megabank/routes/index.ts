import { Router } from 'express';
import { createWebhookRouter } from './webhook.routes';
import { WebhookController } from '../controllers/webhook.controller';

export const createMegaBankRouter = (
  webhookController: WebhookController,
): Router => {
  const router = Router();

  router.use('/webhook', createWebhookRouter(webhookController));

  return router;
};
