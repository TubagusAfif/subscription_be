import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { captureRawBody } from '../../shared/middlewares/raw-body.middleware';

export const createWebhookRouter = (webhookController: WebhookController): Router => {
  const router = Router();

  // Bank Mega webhook — uses captureRawBody to preserve original bytes for signature verification
  router.post('/mpg', captureRawBody, webhookController.handleMpgNotification);

  // Bank Mega Redirect Bridge — catches checkout return callbacks
  router.get('/redirect', webhookController.handleMpgRedirect);

  return router;
};
