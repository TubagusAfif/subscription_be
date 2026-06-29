import { Router } from 'express';
import { MidtransWebhookController } from '../controllers/midtrans-webhook.controller';
import { captureRawBody } from '../../shared/middlewares/raw-body.middleware';

export const createMidtransWebhookRouter = (controller: MidtransWebhookController): Router => {
  const router = Router();

  // Midtrans payment notification — captureRawBody parses the JSON body before
  // express.json() is mounted (this router is registered ahead of it).
  router.post('/notification', captureRawBody, controller.handleNotification);

  return router;
};
