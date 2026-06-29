import { WebhookOutboxRepository } from '../repositories/webhook-outbox.repository';
import { WebhookPayload } from '../types/webhook.types';
import { WebhookEvent } from '../constants/webhook.constants';
import { logger } from '../config/logger';
import crypto from 'crypto';

export class WebhookOutboxService {
  constructor(private webhookOutboxRepository: WebhookOutboxRepository) {}

  /**
   * Insert a new webhook event into the outbox for delivery to Domain 2.
   *
   * This method is called by business logic services (e.g., subscription service,
   * cron jobs) whenever a domain event occurs that Domain 2 needs to know about.
   *
   * The outbox worker (Task 8) will pick it up and deliver it.
   *
   * @param eventType - One of the 9 webhook event types (e.g. 'subscription.created')
   * @param companyId - The company_id in Domain 2
   * @param payload   - The full webhook payload to send
   * @param dedupeKey - Optional STABLE business key for the logical event (e.g.
   *   `subscription.expired:42:2026-06-25`). When provided, the idempotency key
   *   is derived from it deterministically, so the same logical event emitted
   *   more than once — e.g. by the daily cron running on every PM2 instance —
   *   collapses to a single outbox row (the unique index on idempotency_key
   *   rejects the duplicates). When omitted, a random key is generated as before.
   */
  async insertEvent(
    eventType: WebhookEvent,
    companyId: number,
    payload: WebhookPayload,
    dedupeKey?: string,
  ): Promise<void> {
    const eventShort = eventType.replace('.', '_');
    let idempotencyKey: string;
    if (dedupeKey) {
      const digest = crypto.createHash('sha256').update(dedupeKey).digest('hex').slice(0, 16);
      idempotencyKey = `d1_${eventShort}_${digest}`;
    } else {
      const unixMs = Date.now();
      const random = crypto.randomBytes(3).toString('hex'); // 6 hex chars
      idempotencyKey = `d1_${eventShort}_${unixMs}_${random}`;
    }

    try {
      await this.webhookOutboxRepository.insert({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        company_id: companyId,
        payload: payload as unknown as object,
        next_attempt_at: new Date(), // immediate first attempt
      });
    } catch (error) {
      // A unique-constraint violation means this logical event was already
      // enqueued (concurrent/duplicate emit). That's the desired dedup outcome —
      // swallow it. Re-throw anything else.
      if (this.isDuplicateKey(error)) {
        logger.info('[OutboxService] Duplicate event suppressed', { eventType, idempotencyKey });
        return;
      }
      throw error;
    }

    logger.info('[OutboxService] Event inserted', {
      eventType,
      companyId,
      idempotencyKey,
    });
  }

  /** True when the error is a Prisma P2002 unique-constraint violation. */
  private isDuplicateKey(error: unknown): boolean {
    return (
      typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
    );
  }
}
