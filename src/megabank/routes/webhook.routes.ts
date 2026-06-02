import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

export const createWebhookRouter = (webhookController: WebhookController): Router => {
  const router = Router();

  // Bank Mega webhook — public endpoint, verified by signature
  router.post('/mpg', webhookController.handleMpgNotification);

  // Bank Mega Redirect Bridge — catches checkout return callbacks
  router.get('/redirect', webhookController.handleMpgRedirect);

  return router;
};
