import { WebhookOutboxService } from '../../../shared/services/webhook-outbox.service';
import { WebhookOutboxRepository } from '../../../shared/repositories/webhook-outbox.repository';
import { WebhookPayload } from '../../../shared/types/webhook.types';
import { WebhookEvent } from '../../../shared/constants/webhook.constants';
import crypto from 'crypto';

jest.mock('../../../shared/config/logger', () => ({
  logger: {
    info: jest.fn(),
  },
}));

describe('WebhookOutboxService', () => {
  let service: WebhookOutboxService;
  let mockRepository: jest.Mocked<WebhookOutboxRepository>;

  beforeEach(() => {
    mockRepository = {
      insert: jest.fn(),
    } as unknown as jest.Mocked<WebhookOutboxRepository>;

    service = new WebhookOutboxService(mockRepository);

    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should insert an event into the outbox with generated idempotency key', async () => {
    const eventType: WebhookEvent = 'subscription.created';
    const companyId = 123;
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: '2026-06-03T00:00:00Z',
      data: {
        company_id: companyId,
        external_subscription_id: 'sub_123',
        subscription_update: {
          status: 'active',
          max_clinics: 2,
          max_users_per_clinic: 5,
          features: [],
          addons: {},
        },
      },
    };

    // Mock crypto.randomBytes to return deterministic value
    const mockRandomBytes = Buffer.from('a3f5c2', 'hex');
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(mockRandomBytes as any);

    await service.insertEvent(eventType, companyId, payload);

    expect(mockRepository.insert).toHaveBeenCalledWith({
      idempotency_key: 'd1_subscription_created_1780444800000_a3f5c2',
      event_type: eventType,
      company_id: companyId,
      payload: payload,
      next_attempt_at: new Date('2026-06-03T00:00:00Z'),
    });

    jest.restoreAllMocks();
  });
});
