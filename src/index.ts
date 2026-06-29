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
import { createMidtransRouter } from './midtrans/routes';
import { createInternalRouter } from './internal/routes/internal.routes';
import { createCronRouter } from './cron/routes/cron.routes';

// Initialize Middlewares
const authenticate = createAuthenticateMiddleware(container.services.tokenService);

// Initialize Domain Routers
const clientRouter = createClientRouter(
  container.controllers.clientAuthController,
  container.controllers.coinOrderController,
  container.controllers.coinWalletController,
  container.controllers.clientSubscriptionController,
  container.controllers.clientDashboardController,
  container.controllers.clientAccountController,
  container.controllers.sharedPlanController,
  container.controllers.sharedBundleController,
  container.controllers.sharedCurrencyController,
  container.controllers.sharedTaxController,
  container.controllers.sharedPaymentMethodController,
  authenticate,
);

const subscriptionRouter = createSubscriptionRouter(
  container.controllers.subscriptionAuthController,
  container.controllers.planController,
  container.controllers.currencyController,
  container.controllers.bundleController,
  container.controllers.taxController,
  container.controllers.sharedPlanController,
  container.controllers.sharedTaxController,
  container.controllers.dentalAdController,
  container.controllers.adminDashboardController,
  container.controllers.paymentMethodController,
  container.controllers.reportController,
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
  container.services.webhookProcessorService,
);

const midtransRouter = createMidtransRouter(container.controllers.midtransWebhookController);

const internalRouter = createInternalRouter(container.controllers.internalController);

const cronRouter = createCronRouter(container.controllers.cronController);

const app = createApp(
  clientRouter,
  subscriptionRouter,
  sharedRouter,
  megaBankRouter,
  midtransRouter,
  internalRouter,
  cronRouter,
);

async function bootstrap() {
  try {
    logger.info('Running startup health checks...');

    // Check Database connection
    await container.prisma.$connect();
    // A simple query to ensure the connection is truly active
    await container.prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully.');

    // Start server only if health checks pass
    const server = app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await container.prisma.$disconnect();
        logger.info('Database connections closed.');
        process.exit(0);
      });
      
      // Force exit if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server. Health check failed!', { error });
    process.exit(1); // Exit with failure code
  }
}

bootstrap();
