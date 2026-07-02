import { Router } from 'express';
import { createWebhookRouter } from './webhook.routes';
import { createDevSimulateRouter } from './dev-simulate.routes';
import { createCoinOrderRouter } from './coin-order.routes';
import { WebhookController } from '../controllers/webhook.controller';
import { CoinOrderController } from '../controllers/coin-order.controller';
import { WebhookProcessorService } from '../services/webhook-processor.service';
import { createIpWhitelist } from '../../shared/middlewares/ip-whitelist.middleware';
import { env } from '../../shared/config/env';
import { logger } from '../../shared/config/logger';

export const createMegaBankRouter = (
  webhookController: WebhookController,
  webhookProcessorService: WebhookProcessorService,
  coinOrderController: CoinOrderController,
): Router => {
  const router = Router();

  // Restrict all MegaBank routes to whitelisted IPs. When MEGABANK_IP_WHITELIST
  // is unset/empty the whitelist is null and every IP is allowed through.
  router.use(createIpWhitelist(env.MEGABANK_IP_WHITELIST));

  router.use('/webhook', createWebhookRouter(webhookController));

  // Dev-only mock payment simulator — only registered when MPG_MOCK_MODE=true
  // AND we are not running in production. These endpoints are unauthenticated
  // and can credit coins without a real payment, so they must never exist in prod.
  // To remove: delete this block and the dev-simulate.routes.ts file
  if (env.MPG_MOCK_MODE && env.NODE_ENV !== 'production') {
    logger.warn(
      '[MegaBankRouter] MPG_MOCK_MODE is ON — registering dev simulate routes at /api/config/dev/*',
    );
    router.use('/dev', createDevSimulateRouter(webhookProcessorService));
  }

  router.use('/coin-order', createCoinOrderRouter(coinOrderController));

  return router;
};
