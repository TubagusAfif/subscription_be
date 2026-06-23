import { Router } from 'express';
import { createWebhookRouter } from './webhook.routes';
import { createDevSimulateRouter } from './dev-simulate.routes';
import { WebhookController } from '../controllers/webhook.controller';
import { WebhookProcessorService } from '../services/webhook-processor.service';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/config/logger';

export const createMegaBankRouter = (
  webhookController: WebhookController,
  webhookProcessorService: WebhookProcessorService,
): Router => {
  const router = Router();

  router.use('/webhook', createWebhookRouter(webhookController));

  // Dev-only mock payment simulator — only registered when MPG_MOCK_MODE=true
  // AND we are not running in production. These endpoints are unauthenticated
  // and can credit coins without a real payment, so they must never exist in prod.
  // To remove: delete this block and the dev-simulate.routes.ts file
  if (env.MPG_MOCK_MODE && env.NODE_ENV !== 'production') {
    logger.warn('[MegaBankRouter] MPG_MOCK_MODE is ON — registering dev simulate routes at /api/megabank/dev/*');
    router.use('/dev', createDevSimulateRouter(webhookProcessorService));
  }

  return router;
};
