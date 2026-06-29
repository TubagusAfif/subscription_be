import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Internal Webhook API',
    version: '1.0.0',
    description:
      'API Documentation for internal routes, specifically for handling requests from Domain 2 (e.g. clinic, staff management quota assignments) and requesting renewal URLs.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Local server',
    },
  ],
  components: {
    securitySchemes: {
      webhookAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Webhook-Signature',
        description: 'HMAC SHA256 signature of the payload using the webhook secret.',
      },
    },
    schemas: {
      SlotAssignRequest: {
        type: 'object',
        required: [
          'external_subscription_id',
          'resource_type',
          'ref_id',
          'ref_type',
          'assigned_at',
        ],
        properties: {
          external_subscription_id: { type: 'string', example: 'sub_123456789' },
          resource_type: { type: 'string', enum: ['CLINIC', 'USER'], example: 'USER' },
          ref_id: { type: 'integer', example: 101 },
          ref_type: { type: 'string', enum: ['clinic', 'staff', 'doctor'], example: 'staff' },
          assigned_at: { type: 'string', format: 'date-time', example: '2024-07-02T08:27:12Z' },
        },
      },
      SlotReleaseRequest: {
        type: 'object',
        required: ['external_subscription_id', 'resource_type', 'ref_id'],
        properties: {
          external_subscription_id: { type: 'string', example: 'sub_123456789' },
          resource_type: { type: 'string', enum: ['CLINIC', 'USER'], example: 'USER' },
          ref_id: { type: 'integer', example: 101 },
        },
      },
      RenewalUrlRequest: {
        type: 'object',
        required: ['external_subscription_id', 'return_url'],
        properties: {
          external_subscription_id: { type: 'string', example: 'sub_123456789' },
          return_url: { type: 'string', example: 'https://idental.com/dashboard/billing' },
        },
      },
    },
  },
  security: [{ webhookAuth: [] }],
  paths: {
    '/internal/slots/assign': {
      post: {
        tags: ['Slot Management'],
        summary: 'Assign Quota Slot',
        description:
          'Called by Domain 2 when an owner creates a new clinic, staff, or doctor. Uses transactional locking to prevent race conditions. Returns 409 if quota is exceeded.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SlotAssignRequest',
              },
            },
          },
        },
        responses: {
          '200': { description: 'Slot assigned successfully' },
          '409': { description: 'Quota exceeded' },
        },
      },
    },
    '/internal/slots/release': {
      post: {
        tags: ['Slot Management'],
        summary: 'Release Quota Slot',
        description:
          'Called by Domain 2 when an owner deletes a clinic, staff, or doctor. Idempotent.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SlotReleaseRequest',
              },
            },
          },
        },
        responses: {
          '200': { description: 'Slot released successfully' },
        },
      },
    },
    '/internal/subscriptions/by-company/{external_subscription_id}': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get Subscription Snapshot',
        description:
          'Returns full subscription snapshot in subscription.sync format. Domain 2 uses this for re-sync, reconciliation, or startup.',
        parameters: [
          {
            in: 'path',
            name: 'external_subscription_id',
            required: true,
            schema: { type: 'string' },
            example: 'sub_123456789',
          },
        ],
        responses: {
          '200': { description: 'Subscription snapshot returned' },
          '404': { description: 'Subscription not found' },
        },
      },
    },
    '/internal/billing/renewal-url': {
      post: {
        tags: ['Billing'],
        summary: 'Generate Renewal URL',
        description:
          "Generates a one-time, short-lived checkout URL. Domain 2 calls this when a user clicks 'Perpanjang'.",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RenewalUrlRequest',
              },
            },
          },
        },
        responses: {
          '200': { description: 'URL generated successfully' },
          '400': { description: 'Invalid return URL domain' },
          '404': { description: 'Subscription not found' },
        },
      },
    },
  },
};

export const createInternalSwaggerRouter = (): ReturnType<typeof import('express').Router> => {
  const router = Router();

  const swaggerUiOptions = {
    customSiteTitle: spec.info.title,
  };

  router.use('/', swaggerUi.serveFiles(spec, swaggerUiOptions));
  router.get('/', swaggerUi.setup(spec, swaggerUiOptions));
  router.get('/spec.json', (_, res) => res.json(spec));

  return router;
};
