import { DailyExpiryService } from '../../../cron/services/daily-expiry.service';

describe('DailyExpiryService', () => {
  let service: DailyExpiryService;

  const mockFindMany = jest.fn();
  const mockUpdate = jest.fn();
  const mockPrisma = {
    subscription: { findMany: mockFindMany, update: mockUpdate },
  };
  const mockOutbox = { insertEvent: jest.fn() };
  const mockMail = { sendExpiryWarningEmail: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({});
    mockOutbox.insertEvent.mockResolvedValue(undefined);
    mockMail.sendExpiryWarningEmail.mockResolvedValue(undefined);
    service = new DailyExpiryService(mockPrisma as any, mockOutbox as any, mockMail as any);
  });

  const sub = (overrides = {}) => ({
    id: 1,
    user_id: 42,
    user: { name: 'Alice', email: 'alice@example.com' },
    sku: { sku_name: 'Gold', sku_code: 'gold_m' },
    purchase_token: 'tok-1',
    child_subscriptions: [],
    ...overrides,
  });

  it('should complete without side effects when nothing is expiring', async () => {
    mockFindMany.mockResolvedValue([]);

    await service.runDailyExpirySweep();

    expect(mockMail.sendExpiryWarningEmail).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockOutbox.insertEvent).not.toHaveBeenCalled();
  });

  it('should send an H-7 pre-expiry warning email for soon-to-expire subscriptions', async () => {
    // Call 1 = H-7 batch; the remaining queries return nothing.
    mockFindMany.mockResolvedValueOnce([sub()]).mockResolvedValue([]);

    await service.runDailyExpirySweep();

    expect(mockMail.sendExpiryWarningEmail).toHaveBeenCalledWith(
      { name: 'Alice', email: 'alice@example.com' },
      7,
      'Gold',
    );
  });

  it('should move just-expired subscriptions to ON_HOLD and send the grace email', async () => {
    // Calls 1-4 (pre-expiry) empty, call 5 (grace starts) returns one sub.
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sub()])
      .mockResolvedValue([]);

    await service.runDailyExpirySweep();

    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'ON_HOLD' } });
    expect(mockMail.sendExpiryWarningEmail).toHaveBeenCalledWith(expect.anything(), -1, 'Gold');
  });

  it('should expire subscriptions past the grace period and emit a subscription.expired event', async () => {
    // Calls 1-5 empty, call 6 (enforcement) returns one ON_HOLD sub with no addons.
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([sub()]);

    await service.runDailyExpirySweep();

    expect(mockMail.sendExpiryWarningEmail).toHaveBeenCalledWith(expect.anything(), -7, 'Gold');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    );
    expect(mockOutbox.insertEvent).toHaveBeenCalledWith(
      'subscription.expired',
      42,
      expect.anything(),
      expect.stringContaining('subscription.expired:1:'),
    );
  });

  it('should propagate errors raised during the sweep', async () => {
    mockFindMany.mockRejectedValue(new Error('db down'));

    await expect(service.runDailyExpirySweep()).rejects.toThrow('db down');
  });
});
