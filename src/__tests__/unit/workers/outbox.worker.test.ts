import { OutboxWorker } from '../../../workers/outbox.worker';
import { WebhookOutboxRepository } from '../../../shared/repositories/webhook-outbox.repository';
import { env } from '../../../shared/config/env';

jest.mock('../../../shared/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../shared/config/env', () => ({
  env: {
    WEBHOOK_SHARED_SECRET: 'test-secret',
    DOMAIN2_BASE_URL: 'https://test-domain2.com',
  },
}));

// Mock global fetch
const originalFetch = global.fetch;

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let mockRepository: jest.Mocked<WebhookOutboxRepository>;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockRepository = {
      recoverStaleProcessing: jest.fn().mockResolvedValue(0),
      fetchPending: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
      scheduleRetry: jest.fn(),
    } as unknown as jest.Mocked<WebhookOutboxRepository>;

    mockFetch = jest.fn();
    global.fetch = mockFetch;

    worker = new OutboxWorker(mockRepository);

    jest.useFakeTimers();
  });

  afterEach(() => {
    worker.stop();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  const getMockEvent = (overrides = {}) => ({
    id: 1,
    idempotency_key: 'test_key',
    event_type: 'subscription.created',
    company_id: 123,
    payload: { test: 'data' },
    status: 'PENDING',
    attempts: 0,
    next_attempt_at: new Date(),
    last_error: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  it('should process events successfully', async () => {
    const mockEvent = getMockEvent();
    mockRepository.fetchPending.mockResolvedValue([mockEvent as any]);
    mockRepository.markProcessing.mockResolvedValue(true);
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });

    // Start manually to trigger poll
    const pollPromise = (worker as any).poll();
    await pollPromise;

    expect(mockRepository.fetchPending).toHaveBeenCalled();
    expect(mockRepository.markProcessing).toHaveBeenCalledWith(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-domain2.com/api/internal/webhook/subscription-change',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Webhook-Event': 'subscription.created',
          'X-Idempotency-Key': 'test_key',
          'X-Webhook-Attempt': '1',
        }),
      })
    );
    expect(mockRepository.markCompleted).toHaveBeenCalledWith(1);
  });

  it('should reclaim stale PROCESSING events before fetching pending ones', async () => {
    mockRepository.recoverStaleProcessing.mockResolvedValue(2);
    mockRepository.fetchPending.mockResolvedValue([]);

    await (worker as any).poll();

    expect(mockRepository.recoverStaleProcessing).toHaveBeenCalled();
    expect(mockRepository.fetchPending).toHaveBeenCalled();
  });

  it('should not process event if already locked (markProcessing returns false)', async () => {
    const mockEvent = getMockEvent();
    mockRepository.fetchPending.mockResolvedValue([mockEvent as any]);
    mockRepository.markProcessing.mockResolvedValue(false);

    await (worker as any).poll();

    expect(mockRepository.markProcessing).toHaveBeenCalledWith(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRepository.markCompleted).not.toHaveBeenCalled();
  });

  it('should mark as FATAL on 401 or 422', async () => {
    const mockEvent = getMockEvent();
    mockRepository.fetchPending.mockResolvedValue([mockEvent as any]);
    mockRepository.markProcessing.mockResolvedValue(true);
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: jest.fn().mockResolvedValue('Invalid schema'),
    });

    await (worker as any).poll();

    expect(mockRepository.markFailed).toHaveBeenCalledWith(
      1,
      'FATAL: HTTP 422 — Invalid schema'
    );
    expect(mockRepository.scheduleRetry).not.toHaveBeenCalled();
  });

  it('should schedule retry on 500 error', async () => {
    const mockEvent = getMockEvent();
    mockRepository.fetchPending.mockResolvedValue([mockEvent as any]);
    mockRepository.markProcessing.mockResolvedValue(true);
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal server error'),
    });

    await (worker as any).poll();

    expect(mockRepository.scheduleRetry).toHaveBeenCalledWith(
      1,
      expect.any(Date),
      'HTTP 500 — Internal server error'
    );
  });

  it('should mark as FAILED if max retries exceeded', async () => {
    const mockEvent = getMockEvent({ attempts: 6 }); // MAX_RETRY_ATTEMPTS is 6
    mockRepository.fetchPending.mockResolvedValue([mockEvent as any]);
    mockRepository.markProcessing.mockResolvedValue(true);
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal server error'),
    });

    await (worker as any).poll();

    expect(mockRepository.markFailed).toHaveBeenCalledWith(
      1,
      expect.stringContaining('Max retries exceeded')
    );
  });
});
