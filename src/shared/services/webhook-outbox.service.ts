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
   */
  async insertEvent(
    eventType: WebhookEvent,
    companyId: number,
    payload: WebhookPayload,
  ): Promise<void> {
    const eventShort = eventType.replace('.', '_');
    const unixMs = Date.now();
    const random = crypto.randomBytes(3).toString('hex'); // 6 hex chars
    const idempotencyKey = `d1_${eventShort}_${unixMs}_${random}`;

    await this.webhookOutboxRepository.insert({
      idempotency_key: idempotencyKey,
      event_type: eventType,
      company_id: companyId,
      payload: payload as unknown as object,
      next_attempt_at: new Date(), // immediate first attempt
    });

    logger.info('[OutboxService] Event inserted', {
      eventType,
      companyId,
      idempotencyKey,
    });
  }
}
