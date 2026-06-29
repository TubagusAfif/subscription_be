import { WebhookOutboxRepository } from '../shared/repositories/webhook-outbox.repository';
import { signWebhookPayload } from '../shared/utils/crypto.util';
import { logDomain2Outbound } from '../shared/utils/domain2-dev-log.util';
import { env } from '../shared/config/env';
import { logger } from '../shared/config/logger';
import {
  RETRY_DELAYS_MS,
  MAX_RETRY_ATTEMPTS,
  OUTBOX_POLL_INTERVAL_MS,
  OUTBOX_BATCH_SIZE,
  OUTBOX_PROCESSING_TIMEOUT_MS,
} from '../shared/constants/webhook.constants';
import { WebhookOutbox } from '@prisma/client';

export class OutboxWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(private webhookOutboxRepository: WebhookOutboxRepository) {}

  /**
   * Start the worker. Polls the outbox every 30 seconds.
   * Call this once during server bootstrap.
   */
  start(): void {
    logger.info('[OutboxWorker] Starting outbox worker', {
      pollIntervalMs: OUTBOX_POLL_INTERVAL_MS,
      batchSize: OUTBOX_BATCH_SIZE,
    });

    // Run immediately on start, then every interval
    this.poll();
    this.intervalId = setInterval(() => this.poll(), OUTBOX_POLL_INTERVAL_MS);
  }

  /**
   * Stop the worker. Call during graceful shutdown.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[OutboxWorker] Stopped');
    }
  }

  /**
   * Main poll cycle. Fetches pending events and processes them one by one.
   */
  private async poll(): Promise<void> {
    // Prevent overlapping poll cycles
    if (this.isProcessing) {
      logger.debug('[OutboxWorker] Previous poll still running, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      // Reclaim any events stranded in PROCESSING by a previous crash before fetching.
      const reclaimed = await this.webhookOutboxRepository.recoverStaleProcessing(
        OUTBOX_PROCESSING_TIMEOUT_MS,
      );
      if (reclaimed > 0) {
        logger.warn(`[OutboxWorker] Reclaimed ${reclaimed} stale PROCESSING events`);
      }

      const events = await this.webhookOutboxRepository.fetchPending(OUTBOX_BATCH_SIZE);

      if (events.length === 0) {
        return;
      }

      logger.info(`[OutboxWorker] Processing ${events.length} pending events`);

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      logger.error('[OutboxWorker] Poll cycle failed', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single outbox event:
   * 1. Mark as PROCESSING (prevents duplicate pickup)
   * 2. Sign the payload with HMAC-SHA256
   * 3. Send HTTP POST to Domain 2
   * 4. Handle response (complete, retry, or fail)
   */
  private async processEvent(event: WebhookOutbox): Promise<void> {
    // Step 1: Optimistic lock — mark as PROCESSING
    const locked = await this.webhookOutboxRepository.markProcessing(event.id);
    if (!locked) {
      // Another worker already picked this up
      return;
    }

    // Step 2: Prepare the request
    const rawBody = JSON.stringify(event.payload);
    const signature = signWebhookPayload(rawBody, env.WEBHOOK_SHARED_SECRET);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const attempt = event.attempts + 1;

    // Step 3: Send HTTP POST to Domain 2
    const webhookUrl = `${env.DOMAIN2_BASE_URL}/api/internal/webhook/subscription-change`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event.event_type,
      'X-Idempotency-Key': event.idempotency_key,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Attempt': String(attempt),
    };

    // Dev-only: record exactly what we send to Domain 2 (no-op outside development).
    const startedAt = Date.now();

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: rawBody,
        signal: AbortSignal.timeout(30_000), // 30 second timeout
      });

      logDomain2Outbound({
        event_type: event.event_type,
        idempotency_key: event.idempotency_key,
        attempt,
        url: webhookUrl,
        method: 'POST',
        headers,
        body: event.payload,
        response: { status: response.status, ok: response.ok },
        duration_ms: Date.now() - startedAt,
      });

      // Step 4: Handle response
      if (response.ok) {
        // 200 — Success
        await this.webhookOutboxRepository.markCompleted(event.id);
        logger.info('[OutboxWorker] Event delivered successfully', {
          id: event.id,
          eventType: event.event_type,
          idempotencyKey: event.idempotency_key,
        });
        return;
      }

      // Non-200 responses
      const responseBody = await response.text();

      if (response.status === 401 || response.status === 422) {
        // FATAL — config error or schema mismatch. DO NOT retry.
        await this.webhookOutboxRepository.markFailed(
          event.id,
          `FATAL: HTTP ${response.status} — ${responseBody}`,
        );
        logger.error('[OutboxWorker] FATAL error, not retrying', {
          id: event.id,
          status: response.status,
          body: responseBody,
        });
        return;
      }

      // 429, 5xx — Transient. Retry.
      await this.scheduleRetry(
        event,
        `HTTP ${response.status} — ${responseBody}`,
        response.status === 429,
      );
    } catch (error) {
      // Network error, timeout, etc. — Retry.
      const errorMsg = error instanceof Error ? error.message : String(error);

      logDomain2Outbound({
        event_type: event.event_type,
        idempotency_key: event.idempotency_key,
        attempt,
        url: webhookUrl,
        method: 'POST',
        headers,
        body: event.payload,
        error: errorMsg,
        duration_ms: Date.now() - startedAt,
      });

      await this.scheduleRetry(event, `Network error: ${errorMsg}`, false);
    }
  }

  /**
   * Schedule a retry with exponential backoff + jitter.
   *
   * Backoff schedule: 0, 1m, 5m, 30m, 2h, 12h
   * Jitter: ±10% random to avoid thundering herd
   *
   * If max attempts exceeded (6), mark as FAILED.
   */
  private async scheduleRetry(
    event: WebhookOutbox,
    errorMessage: string,
    isRateLimited: boolean,
  ): Promise<void> {
    const nextAttempt = event.attempts + 1; // +1 because we're about to increment

    if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
      // Max retries exceeded — mark as FAILED
      await this.webhookOutboxRepository.markFailed(
        event.id,
        `Max retries exceeded (${MAX_RETRY_ATTEMPTS}). Last error: ${errorMessage}`,
      );
      logger.error('[OutboxWorker] Max retries exceeded, marking as FAILED', {
        id: event.id,
        eventType: event.event_type,
        attempts: nextAttempt,
      });
      return;
    }

    // Calculate delay with jitter
    let delayMs: number = RETRY_DELAYS_MS[nextAttempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 0;

    // Double delay for rate limiting (429)
    if (isRateLimited) {
      delayMs = delayMs * 2;
    }

    // Add jitter: ±10%
    const jitter = delayMs * 0.1 * (Math.random() * 2 - 1); // random between -10% and +10%
    delayMs = Math.max(0, delayMs + jitter);

    const nextAttemptAt = new Date(Date.now() + delayMs);

    await this.webhookOutboxRepository.scheduleRetry(event.id, nextAttemptAt, errorMessage);

    logger.warn('[OutboxWorker] Scheduled retry', {
      id: event.id,
      eventType: event.event_type,
      attempt: nextAttempt,
      nextAttemptAt: nextAttemptAt.toISOString(),
      error: errorMessage,
    });
  }
}
