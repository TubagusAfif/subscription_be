import 'dotenv/config';
import { initSentry } from './shared/config/sentry';
import { logger } from './shared/config/logger';
initSentry();

import { env } from './shared/config/env';
import { createApp } from './app';
import { container } from './shared/container';

import { createAuthenticateMiddleware } from './shared/middlewares/auth.middleware';

import { createClientRouter } from './client/routes';
import { createSubscriptionRouter } from './subscription/routes';
import { createSharedRouter } from './shared/routes';
import { createMegaBankRouter } from './megabank/routes';

// Initialize Middlewares
const authenticate = createAuthenticateMiddleware(container.services.tokenService);

// Initialize Domain Routers
const clientRouter = createClientRouter(
  container.controllers.clientAuthController,
  container.controllers.coinOrderController,
  container.controllers.coinWalletController,
  container.controllers.clientSubscriptionController,
  container.controllers.clientDashboardController,
  container.controllers.sharedPlanController,
  container.controllers.sharedBundleController,
  container.controllers.sharedCurrencyController,
  authenticate,
);

const subscriptionRouter = createSubscriptionRouter(
  container.controllers.subscriptionAuthController,
  container.controllers.planController,
  container.controllers.currencyController,
  container.controllers.bundleController,
  container.controllers.taxController,
  container.controllers.sharedPlanController,
  container.controllers.dentalAdController,
  container.controllers.adminDashboardController,
  authenticate,
);

const sharedRouter = createSharedRouter(
  container.controllers.sharedAuthController,
  container.controllers.uploadController,
  container.controllers.accountController,
  authenticate,
);

const megaBankRouter = createMegaBankRouter(
  container.controllers.megaBankWebhookController,
);

const app = createApp(clientRouter, subscriptionRouter, sharedRouter, megaBankRouter);

async function bootstrap() {
  try {
    logger.info('Running startup health checks...');
    
    // Check Database connection
    await container.prisma.$connect();
    // A simple query to ensure the connection is truly active
    await container.prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully.');

    // Start server only if health checks pass
    app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server. Health check failed!', { error });
    process.exit(1); // Exit with failure code
  }
}

bootstrap();
