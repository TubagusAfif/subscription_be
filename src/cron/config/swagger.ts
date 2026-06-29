import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Cron Jobs API',
    version: '1.0.0',
    description: 'API Documentation for Cron jobs, such as triggering the daily expiry sweep.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Local server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer token using the CRON_SECRET environment variable for authentication.',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/cron/daily-expiry': {
      post: {
        tags: ['Cron'],
        summary: 'Trigger Daily Expiry Check',
        description:
          'Trigger the daily sweep that processes subscription grace periods, expiry emails, and enforcement webhooks. Requires CRON_SECRET token.',
        responses: {
          '200': { description: 'Daily expiry processing completed successfully' },
          '401': { description: 'Unauthorized. CRON_SECRET is missing or invalid.' },
          '500': { description: 'Internal server error during expiry processing' },
        },
      },
    },
  },
};

export const createCronSwaggerRouter = (): ReturnType<typeof import('express').Router> => {
  const router = Router();

  const swaggerUiOptions = {
    customSiteTitle: spec.info.title,
  };

  router.use('/', swaggerUi.serveFiles(spec, swaggerUiOptions));
  router.get('/', swaggerUi.setup(spec, swaggerUiOptions));
  router.get('/spec.json', (_, res) => res.json(spec));

  return router;
};
