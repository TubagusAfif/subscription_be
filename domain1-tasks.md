# Domain 1 Implementation Tasks

Based on the `domain1-integration-spec.md`, the following tasks need to be completed to fully integrate Domain 1 (Subscription Platform) with Domain 2.

## 1. Authentication & Security
- [ ] **Shared Secret Setup**: Add `WEBHOOK_SHARED_SECRET` to environment variables.
  *Suggestion: Use `openssl rand -hex 32` to generate a 256-bit key and store it securely.*
- [ ] **HMAC Verification Middleware**: Create a middleware for the `/api/internal/*` routes to verify `X-Webhook-Signature`, `X-Webhook-Timestamp` (drift < 5 mins), and `X-Idempotency-Key` using `crypto.timingSafeEqual`.
  *Suggestion: Place this in `src/shared/middlewares/webhook-auth.middleware.ts`. Use `express.raw({ type: 'application/json' })` so you can verify the raw string before parsing it. Example implementation:*
  ```typescript
  import crypto from 'crypto';
  import { Request, Response, NextFunction } from 'express';

  export const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestampStr = req.headers['x-webhook-timestamp'] as string;
    const secret = process.env.WEBHOOK_SHARED_SECRET;

    if (!secret || !signature || !timestampStr) {
      return res.status(401).json({ success: false, error_code: 'UNAUTHORIZED', message: 'Missing headers' });
    }

    // Check drift (< 5 minutes)
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return res.status(401).json({ success: false, error_code: 'UNAUTHORIZED', message: 'Timestamp drift too large' });
    }

    // Validate signature
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({ success: false, error_code: 'UNAUTHORIZED', message: 'Invalid signature' });
    }

    // Replace raw body with parsed object for downstream handlers
    req.body = JSON.parse(req.body.toString());
    next();
  };
  ```
- [x] **Webhook Signer Utility**: Create a utility function to generate HMAC-SHA256 signatures for outgoing webhooks.
  *Suggestion: Place this in `src/shared/utils/webhook-signer.util.ts`. Example implementation:*
  ```typescript
  import crypto from 'crypto';

  export const signWebhookPayload = (rawBody: string, secret: string): string => {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  };
  ```

## 2. Database Schema (Prisma)
- [ ] **Outbox Table**: Add `WebhookOutbox` model to track outgoing events (`idempotency_key`, `event_type`, `company_id`, `payload`, `status`, `attempts`, `next_attempt_at`, etc.).
- [ ] **Quotas Table**: Ensure `SubscriptionQuota` model exists with `resource_type`, `max_quota`, and `used_quota`.
- [ ] **Slot Mapping Table**: Ensure `AddonSlotMap` model exists to map `subscription_id`, `resource_type`, `ref_id`, and `ref_type`.

## 3. Webhook Outbox System (Domain 1 → Domain 2)
- [ ] **Outbox Service**: Create a service to insert events into `WebhookOutbox`.
- [ ] **Outbox Worker/Cron**: Create a worker to query `status='pending'` and `next_attempt_at <= NOW()` every 30 seconds.
- [ ] **Retry Policy**: Implement exponential backoff (1m, 5m, 30m, 2h, 12h) with jitter for 429, 5xx, or network errors. Mark as `FAILED` after 6 attempts.
- [ ] **Event Formatters**: Create payload builders for the 9 standard events (`subscription.created`, `subscription.sync`, `subscription.renewed`, `subscription.upgraded`, `subscription.downgraded`, `subscription.expired`, `subscription.cancelled`, `addon.expired`, `addon.renewed`).

## 4. Internal REST Endpoints (Domain 2 → Domain 1)
All endpoints below must be mounted under `/api/internal/v1/*` and protected by the HMAC Middleware using `express.raw`.

- [ ] **`POST /slots/assign`**: Implement transactional logic with `FOR UPDATE` lock on quotas. Throw 409 if `used_quota >= max_quota`. Increment quota and insert into `AddonSlotMap`.
- [ ] **`POST /slots/release`**: Implement idempotent logic to release slots (remove from `AddonSlotMap` and decrement `used_quota`).
- [ ] **`GET /subscriptions/by-company/:external_subscription_id`**: Return a full snapshot (`subscription.sync` format) of the requested subscription.
- [ ] **`POST /billing/renewal-url`**: Generate a one-time, short-lived (e.g., 30 mins) checkout URL with a secure token and validation for the `return_url`.

## 5. Cron Jobs & Business Logic
- [ ] **Daily Expiry Check**: Create a cron job running daily at 00:05 WIB to find expiring/expired subscriptions and addons.
- [ ] **Email Notifications**: Trigger emails at H-7, H-3, H-1, H+1 (grace start), and H+7 (enforce).
- [ ] **Grace Period Enforcement**: Once grace period (7 days) ends without payment, trigger `subscription.expired` or `addon.expired` webhooks with specific enforcement types (`full_lockout`, `deactivate_clinics`, `suspend_users`, `feature_removal`).
- [ ] **Trial Expiry**: Add special `"context": "trial_ended"` logic for subscriptions that expire without a payment.
- [ ] **Enforcement Construction**: Correctly map the `enforcement` blocks for each scenario, including `enforcement.type`, `reason`, `clinic_ids`/`staff_ids`/`doctor_ids`, and `message_id`.

## 6. End-to-End Testing
- [ ] **Mock Setup**: Optionally create a mock Domain 2 receiver for local testing.
- [ ] **Handshake Test**: Follow the 5-step handshake test to verify full end-to-end flow.
