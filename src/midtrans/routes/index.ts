import { Router } from 'express';
import { createMidtransWebhookRouter } from './webhook.routes';
import { MidtransWebhookController } from '../controllers/midtrans-webhook.controller';

export const createMidtransRouter = (
  midtransWebhookController: MidtransWebhookController,
): Router => {
  const router = Router();

  router.use('/webhook', createMidtransWebhookRouter(midtransWebhookController));

  return router;
};
