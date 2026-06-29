import { Router } from 'express';
import express from 'express';
import { InternalController } from '../controllers/internal.controller';
import { webhookAuthMiddleware } from '../../shared/middlewares/webhook-auth.middleware';

/**
 * Internal API routes (Domain 2 → Domain 1).
 * Mounted at /api/internal/v1
 *
 * IMPORTANT: Uses express.raw() instead of express.json() because
 * the webhook signature must be verified against the raw body bytes.
 * The webhookAuthMiddleware parses JSON after verification.
 */
export const createInternalRouter = (internalController: InternalController): Router => {
  const router = Router();

  // Use express.raw for ALL internal routes (signature verification needs raw body)
  router.use(express.raw({ type: 'application/json' }));

  // Apply HMAC verification to ALL internal routes
  router.use(webhookAuthMiddleware);

  // Slot management
  router.post('/slots/assign', internalController.slotAssign);
  router.post('/slots/release', internalController.slotRelease);

  // Subscription snapshot
  router.get(
    '/subscriptions/by-company/:external_subscription_id',
    internalController.getSubscriptionByCompany,
  );

  // Billing
  router.post('/billing/renewal-url', internalController.generateRenewalUrl);

  return router;
};
