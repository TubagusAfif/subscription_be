import { DailyExpiryService } from '../../../cron/services/daily-expiry.service';

describe('DailyExpiryService', () => {
  let service: DailyExpiryService;

  const mockFindMany = jest.fn();
  const mockFindFirst = jest.fn();
  const mockUpdate = jest.fn();
  const mockUpdateMany = jest.fn();
  const mockPrisma = {
    subscription: { findMany: mockFindMany, findFirst: mockFindFirst, update: mockUpdate },
    addonSlotMap: { updateMany: mockUpdateMany },
    $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
  };
  const mockOutbox = { insertEvent: jest.fn() };
  const mockMail = { sendExpiryWarningEmail: jest.fn() };
  const mockInternalRepo = { reconcileQuota: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    // Base: every unqueued findMany returns [] so trailing passes (child add-ons,
    // the standalone add-on-expiry sweep) are no-ops unless a test opts in.
    mockFindMany.mockResolvedValue([]);
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({});
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockOutbox.insertEvent.mockResolvedValue(undefined);
    mockMail.sendExpiryWarningEmail.mockResolvedValue(undefined);
    mockInternalRepo.reconcileQuota.mockResolvedValue(undefined);
    service = new DailyExpiryService(
      mockPrisma as any,
      mockOutbox as any,
      mockMail as any,
      mockInternalRepo as any,
    );
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

  it('should revoke only the add-on slots and suspend those users when an add-on expires', async () => {
    const addonSub = {
      id: 2,
      user_id: 42,
      purchase_token: 'addon-tok',
      sku: { addons: [{ resource_type: 'USER_ADDON', is_unlimited: true, quota_value: 0 }] },
      addon_slot_maps: [
        { ref_type: 'staff', ref_id: 501 },
        { ref_type: 'doctor', ref_id: 601 },
      ],
    };
    // Calls 1-6 empty (pre-expiry x4, grace-start, package-enforcement), call 7
    // (the standalone add-on sweep) returns the expired add-on.
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([addonSub]);
    // The owner's package supplies the external_subscription_id + reconcile target.
    mockFindFirst.mockResolvedValue({ id: 1, purchase_token: 'pkg-tok' });

    await service.runDailyExpirySweep();

    // Add-on marked expired.
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: expect.objectContaining({ status: 'EXPIRED' }) }),
    );
    // Only this add-on's slots are released.
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ addon_subscription_id: 2 }) }),
    );
    // Package quota reconciled for the user resource.
    expect(mockInternalRepo.reconcileQuota).toHaveBeenCalledWith(1, 42, 'user', expect.anything());
    // Domain 2 told to suspend exactly the users riding on the add-on.
    expect(mockOutbox.insertEvent).toHaveBeenCalledWith(
      'addon.expired',
      42,
      expect.objectContaining({
        data: expect.objectContaining({
          enforcement: expect.objectContaining({
            type: 'suspend_users',
            staff_ids: [501],
            doctor_ids: [601],
          }),
        }),
      }),
      expect.stringContaining('addon.expired:user:2:'),
    );
  });

  it('should propagate errors raised during the sweep', async () => {
    mockFindMany.mockRejectedValue(new Error('db down'));

    await expect(service.runDailyExpirySweep()).rejects.toThrow('db down');
  });
});
