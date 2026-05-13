import * as Sentry from '@sentry/node';
import { env } from './env';
import { logger } from './logger';

export function initSentry() {
  if (!env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured — skipping initialization.');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    integrations: [Sentry.prismaIntegration()],
  });

  logger.info('Sentry initialized successfully.');
}

export { Sentry };
