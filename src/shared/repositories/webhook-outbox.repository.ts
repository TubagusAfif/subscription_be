import { PrismaClient, WebhookOutbox, WebhookOutboxStatus } from '@prisma/client';

export class WebhookOutboxRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Insert a new event into the outbox.
   * Called by the OutboxService when a domain event occurs.
   */
  async insert(data: {
    idempotency_key: string;
    event_type: string;
    company_id: number;
    payload: object;
    next_attempt_at: Date;
  }): Promise<WebhookOutbox> {
    return this.prisma.webhookOutbox.create({
      data: {
        idempotency_key: data.idempotency_key,
        event_type: data.event_type,
        company_id: data.company_id,
        payload: data.payload,
        status: 'PENDING',
        attempts: 0,
        next_attempt_at: data.next_attempt_at,
      },
    });
  }

  /**
   * Fetch pending events ready for delivery.
   * Used by the outbox worker every 30 seconds.
   *
   * Query: status = PENDING AND next_attempt_at <= NOW()
   * Ordered by created_at ASC (oldest first).
   * Limited to `batchSize` records.
   */
  async fetchPending(batchSize: number): Promise<WebhookOutbox[]> {
    return this.prisma.webhookOutbox.findMany({
      where: {
        status: 'PENDING',
        next_attempt_at: {
          lte: new Date(),
        },
      },
      orderBy: { created_at: 'asc' },
      take: batchSize,
    });
  }

  /**
   * Mark an event as PROCESSING to prevent duplicate processing by concurrent workers.
   * Returns the updated record, or null if it was already picked up (status != PENDING).
   */
  async markProcessing(id: number): Promise<WebhookOutbox | null> {
    try {
      return await this.prisma.webhookOutbox.update({
        where: { id, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      });
    } catch {
      // Record was already picked up by another worker (status changed)
      return null;
    }
  }

  /**
   * Mark an event as COMPLETED after successful delivery.
   */
  async markCompleted(id: number): Promise<void> {
    await this.prisma.webhookOutbox.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        sent_at: new Date(),
      },
    });
  }

  /**
   * Mark an event as FAILED (max retries exceeded or fatal error).
   */
  async markFailed(id: number, errorMessage: string): Promise<void> {
    await this.prisma.webhookOutbox.update({
      where: { id },
      data: {
        status: 'FAILED',
        last_error: errorMessage,
      },
    });
  }

  /**
   * Schedule a retry: increment attempts, set next_attempt_at, revert to PENDING.
   */
  async scheduleRetry(id: number, nextAttemptAt: Date, errorMessage: string): Promise<void> {
    await this.prisma.webhookOutbox.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: { increment: 1 },
        next_attempt_at: nextAttemptAt,
        last_error: errorMessage,
      },
    });
  }
}
