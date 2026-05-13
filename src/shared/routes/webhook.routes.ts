import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

export const createWebhookRouter = (webhookController: WebhookController): Router => {
  const router = Router();

  // MPG webhook — public endpoint, verified by signature
  router.post('/mpg', webhookController.handleMpgNotification);

  // MPG Redirect Bridge — catches checkout return callbacks
  router.get('/redirect', webhookController.handleMpgRedirect);

  return router;
};
