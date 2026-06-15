import 'dotenv/config';
import { initSentry } from './shared/config/sentry';
import { logger } from './shared/config/logger';
initSentry();

import { env } from './shared/config/env';
import { createApp } from './app';
import { container } from './shared/container';
import { OutboxWorker } from './workers/outbox.worker';
import { startDailyExpiryCron } from './cron/daily-expiry.cron';

import { createAuthenticateMiddleware } from './shared/middlewares/auth.middleware';

import { createClientRouter } from './client/routes';
import { createSubscriptionRouter } from './subscription/routes';
import { createSharedRouter } from './shared/routes';
import { createMegaBankRouter } from './megabank/routes';
import { createInternalRouter } from './shared/routes/internal.routes';

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

const internalRouter = createInternalRouter(
  container.controllers.internalController,
);

const app = createApp(clientRouter, subscriptionRouter, sharedRouter, megaBankRouter, internalRouter);

async function bootstrap() {
  try {
    logger.info('Running startup health checks...');
    
    // Check Database connection
    await container.prisma.$connect();
    // A simple query to ensure the connection is truly active
    await container.prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully.');

    // Start Webhook Outbox Worker
    const outboxWorker = new OutboxWorker(container.repositories.webhookOutboxRepository);
    outboxWorker.start();
    logger.info('OutboxWorker started.');

    // Start Daily Expiry Cron Job
    startDailyExpiryCron(container.prisma, container.services.webhookOutboxService, container.services.mailService);
    logger.info('DailyExpiryCron started.');

    // Start server only if health checks pass
    const server = app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      outboxWorker.stop();
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
