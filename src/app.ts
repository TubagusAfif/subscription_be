import express, { Express } from 'express';
import path from 'path';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { errorHandler } from './shared/middlewares/error.middleware';
import { globalLimiter } from './shared/middlewares/rate-limit.middleware';
import { helmetConfig } from './shared/config/helmet';
import { corsConfig } from './shared/config/cors';
import { env } from './shared/config/env';
import { httpLogStream } from './shared/config/logger';
import { createSwaggerRouter as createClientSwaggerRouter } from './client/config/swagger';
import { createSwaggerRouter as createSubscriptionSwaggerRouter } from './subscription/config/swagger';
import { createMegaBankSwaggerRouter } from './shared/megabank/swagger';
import { createInternalSwaggerRouter } from './shared/config/swagger-internal';

export const createApp = (
  clientRouter: express.Router,
  subscriptionRouter: express.Router,
  sharedRouter: express.Router,
  megaBankRouter: express.Router,
  internalRouter: express.Router,
): Express => {
  const app = express();

  // Trust proxy for rate limit
  app.set('trust proxy', 1);

  // Security
  app.use(helmetConfig);
  app.use(corsConfig);
  app.use(globalLimiter);

  // HTTP Request Logging — Morgan piped through Winston
  app.use(morgan('short', { stream: httpLogStream }));

  // Mount internal router BEFORE express.json() because it needs raw body for HMAC verification
  app.use(`${env.API_PREFIX}/internal`, internalRouter);

  // Mount megabank router BEFORE express.json() — webhook handler uses captureRawBody middleware
  app.use(`${env.API_PREFIX}/megabank`, megaBankRouter);

  // Body & Cookie Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // API Documentation
  app.use('/api-docs/client', createClientSwaggerRouter());
  app.use('/api-docs/subscription', createSubscriptionSwaggerRouter());
  app.use('/api-docs/megabank', createMegaBankSwaggerRouter());
  app.use('/api-docs/internal', createInternalSwaggerRouter());

  // Static Assets
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Domain Routers
  app.use(`${env.API_PREFIX}/client`, clientRouter);
  app.use(`${env.API_PREFIX}/subscription`, subscriptionRouter);
  app.use(`${env.API_PREFIX}/shared`, sharedRouter);

  // Sentry Error Handler
  Sentry.setupExpressErrorHandler(app);

  // Error Handling
  app.use(errorHandler);

  return app;
};