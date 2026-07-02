import jwt from 'jsonwebtoken';
import { InternalService } from '../../../internal/services/internal.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

jest.mock('jsonwebtoken');

describe('InternalService', () => {
  let service: InternalService;

  const mockTx = {};
  const mockPrisma = {
    $transaction: jest.fn(async (cb: any) => cb(mockTx)),
  };

  const mockRepo = {
    findSubscriptionByToken: jest.fn(),
    getQuotaWithLock: jest.fn(),
    getAssignmentSources: jest.fn(),
    countSlotsBySource: jest.fn(),
    incrementQuotaUsed: jest.fn(),
    createAddonSlotMap: jest.fn(),
    findSubscriptionByTokenAnyStatus: jest.fn(),
    findAddonSlotMap: jest.fn(),
    findUserSlotMap: jest.fn(),
    findQuota: jest.fn(),
    reconcileQuota: jest.fn(),
    softDeleteAddonSlotMap: jest.fn(),
    decrementQuotaUsed: jest.fn(),
    getSubscriptionSnapshot: jest.fn(),
    getQuotaDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: a single package source with plenty of room, no slots used yet —
    // so attribution lands on the package unless a test overrides it.
    mockRepo.getAssignmentSources.mockResolvedValue([
      { subscriptionId: 1, capacity: 5, is_unlimited: false },
    ]);
    mockRepo.countSlotsBySource.mockResolvedValue(new Map());
    service = new InternalService(mockPrisma as any, mockRepo as any);
  });

  const assignPayload = {
    external_subscription_id: 'ext-1',
    resource_type: 'CLINIC',
    ref_type: 'clinic',
    ref_id: 100,
  };

  describe('slotAssign', () => {
    it('should throw 404 SUBSCRIPTION_NOT_FOUND when the subscription is missing', async () => {
      mockRepo.findSubscriptionByToken.mockResolvedValue(null);

      await expect(service.slotAssign(assignPayload)).rejects.toMatchObject({
        statusCode: 404,
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
    });

    it('should throw 409 QUOTA_EXCEEDED when no quota row is configured', async () => {
      mockRepo.findSubscriptionByToken.mockResolvedValue({ id: 1 });
      mockRepo.getQuotaWithLock.mockResolvedValue([]);

      await expect(service.slotAssign(assignPayload)).rejects.toMatchObject({
        statusCode: 409,
        code: 'QUOTA_EXCEEDED',
        message: expect.stringContaining('belum dikonfigurasi'),
      });
    });

    it('should throw 409 QUOTA_EXCEEDED when the quota is exhausted', async () => {
      mockRepo.findSubscriptionByToken.mockResolvedValue({ id: 1 });
      mockRepo.getQuotaWithLock.mockResolvedValue([{ id: 9, used_quota: 5, total_quota: 5 }]);

      await expect(service.slotAssign(assignPayload)).rejects.toMatchObject({
        statusCode: 409,
        code: 'QUOTA_EXCEEDED',
        message: expect.stringContaining('habis'),
      });
      expect(mockRepo.incrementQuotaUsed).not.toHaveBeenCalled();
    });

    it('should increment usage, create a slot map and return the remaining quota', async () => {
      mockRepo.findSubscriptionByToken.mockResolvedValue({ id: 1, user_id: 1 });
      mockRepo.getQuotaWithLock.mockResolvedValue([{ id: 9, used_quota: 2, total_quota: 5 }]);
      mockRepo.createAddonSlotMap.mockResolvedValue({ id: 77 });

      const result = await service.slotAssign(assignPayload);

      expect(mockRepo.getQuotaWithLock).toHaveBeenCalledWith(1, 'clinic', mockTx);
      expect(mockRepo.incrementQuotaUsed).toHaveBeenCalledWith(9, mockTx);
      expect(result).toEqual({ slot_id: 77, quota_remaining: 2, attributed_subscription_id: 1 }); // 5 - 2 - 1
    });

    it('should attribute the slot to the add-on once the package is full', async () => {
      mockRepo.findSubscriptionByToken.mockResolvedValue({ id: 1, user_id: 1 });
      mockRepo.getQuotaWithLock.mockResolvedValue([{ id: 9, used_quota: 5, total_quota: 5, is_unlimited: true }]);
      // Package (id 1) capacity 5 is full; unlimited add-on (id 2) takes the rest.
      mockRepo.getAssignmentSources.mockResolvedValue([
        { subscriptionId: 1, capacity: 5, is_unlimited: false },
        { subscriptionId: 2, capacity: 0, is_unlimited: true },
      ]);
      mockRepo.countSlotsBySource.mockResolvedValue(new Map([[1, 5]]));
      mockRepo.createAddonSlotMap.mockResolvedValue({ id: 80 });

      const result = await service.slotAssign(assignPayload);

      expect(mockRepo.createAddonSlotMap).toHaveBeenCalledWith(
        { addon_subscription_id: 2, ref_type: 'clinic', ref_id: 100 },
        mockTx,
      );
      expect(result).toEqual({ slot_id: 80, quota_remaining: -1, attributed_subscription_id: 2 });
    });

    it('should never block an unlimited quota even when used >= total', async () => {
      mockRepo.findSubscriptionByToken.mockResolvedValue({ id: 1, user_id: 1 });
      // used_quota already past total_quota — would normally be QUOTA_EXCEEDED.
      mockRepo.getQuotaWithLock.mockResolvedValue([
        { id: 9, used_quota: 50, total_quota: 0, is_unlimited: true },
      ]);
      mockRepo.getAssignmentSources.mockResolvedValue([
        { subscriptionId: 1, capacity: 0, is_unlimited: true },
      ]);
      mockRepo.createAddonSlotMap.mockResolvedValue({ id: 78 });

      const result = await service.slotAssign(assignPayload);

      expect(mockRepo.incrementQuotaUsed).toHaveBeenCalledWith(9, mockTx);
      expect(result).toEqual({ slot_id: 78, quota_remaining: -1, attributed_subscription_id: 1 }); // -1 = unlimited
    });
  });

  describe('slotRelease', () => {
    const releasePayload = { external_subscription_id: 'ext-1', resource_type: 'CLINIC', ref_id: 100 };

    it('should treat a missing subscription as already released', async () => {
      mockRepo.findSubscriptionByTokenAnyStatus.mockResolvedValue(null);

      const result = await service.slotRelease(releasePayload);

      expect(result).toMatchObject({ quota_remaining: 0 });
      expect(result.note).toContain('already released');
    });

    it('should constrain CLINIC releases to the clinic ref_type', async () => {
      mockRepo.findSubscriptionByTokenAnyStatus.mockResolvedValue({ id: 1, user_id: 7 });
      mockRepo.findUserSlotMap.mockResolvedValue(null);
      mockRepo.findQuota.mockResolvedValue({ total_quota: 5, used_quota: 3 });

      const result = await service.slotRelease(releasePayload);

      // Searches across the owner's subscriptions (by user_id), not just the package.
      expect(mockRepo.findUserSlotMap).toHaveBeenCalledWith(7, 100, ['clinic'], mockTx);
      expect(result).toMatchObject({ quota_remaining: 2 });
      expect(result.note).toContain('already released');
    });

    it('should use staff/doctor ref_types for non-clinic releases', async () => {
      mockRepo.findSubscriptionByTokenAnyStatus.mockResolvedValue({ id: 1, user_id: 7 });
      mockRepo.findUserSlotMap.mockResolvedValue(null);
      mockRepo.findQuota.mockResolvedValue(null);

      await service.slotRelease({ ...releasePayload, resource_type: 'USER' });

      expect(mockRepo.findUserSlotMap).toHaveBeenCalledWith(7, 100, ['staff', 'doctor'], mockTx);
    });

    it('should soft-delete the slot, decrement usage and report remaining quota', async () => {
      mockRepo.findSubscriptionByTokenAnyStatus.mockResolvedValue({ id: 1, user_id: 7 });
      mockRepo.findUserSlotMap.mockResolvedValue({ id: 55 });
      mockRepo.findQuota.mockResolvedValue({ id: 9, total_quota: 5, used_quota: 3 });

      const result = await service.slotRelease(releasePayload);

      expect(mockRepo.softDeleteAddonSlotMap).toHaveBeenCalledWith(55, mockTx);
      expect(mockRepo.decrementQuotaUsed).toHaveBeenCalledWith(9, mockTx);
      expect(result).toMatchObject({ quota_remaining: 3 }); // 5 - (3 - 1)
    });

    it('should not decrement when used_quota is already zero', async () => {
      mockRepo.findSubscriptionByTokenAnyStatus.mockResolvedValue({ id: 1, user_id: 7 });
      mockRepo.findUserSlotMap.mockResolvedValue({ id: 55 });
      mockRepo.findQuota.mockResolvedValue({ id: 9, total_quota: 5, used_quota: 0 });

      await service.slotRelease(releasePayload);

      expect(mockRepo.decrementQuotaUsed).not.toHaveBeenCalled();
    });
  });

  describe('getSubscriptionByCompany', () => {
    it('should throw 404 when the snapshot is missing', async () => {
      mockRepo.getSubscriptionSnapshot.mockResolvedValue(null);

      await expect(service.getSubscriptionByCompany('ext-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
    });

    it('should map a snapshot into the sync payload', async () => {
      mockRepo.getSubscriptionSnapshot.mockResolvedValue({
        user_id: 42,
        purchase_token: 'tok-1',
        status: 'ACTIVE',
        current_billing_start: new Date('2025-01-01T00:00:00.000Z'),
        current_billing_end: new Date('2025-02-01T00:00:00.000Z'),
        quotas: [
          { resource_type: 'clinic', total_quota: 3 },
          { resource_type: 'user', total_quota: 10 },
        ],
        sku: {
          package_tier: 'PRO',
          sku_code: 'PRO_M',
          features: [{ feature: 'x-ray' }],
        },
        child_subscriptions: [],
      });

      const result = await service.getSubscriptionByCompany('ext-1');

      expect(result.event).toBe('subscription.sync');
      expect(result.data.company_id).toBe(42);
      expect(result.data.external_subscription_id).toBe('tok-1');
      expect(result.data.subscription_update).toMatchObject({
        tier: 'pro',
        status: 'active',
        max_clinics: 3,
        max_users_per_clinic: 10,
        features: ['x-ray'],
        billing_start: '2025-01-01',
        billing_end: '2025-02-01',
        trial_end: null,
      });
    });

    it('should map an unlimited quota to the -1 sentinel', async () => {
      mockRepo.getSubscriptionSnapshot.mockResolvedValue({
        user_id: 42,
        purchase_token: 'tok-1',
        status: 'ACTIVE',
        current_billing_start: new Date('2025-01-01T00:00:00.000Z'),
        current_billing_end: new Date('2025-02-01T00:00:00.000Z'),
        quotas: [
          { resource_type: 'clinic', total_quota: 0, is_unlimited: true },
          { resource_type: 'user', total_quota: 10, is_unlimited: false },
        ],
        sku: { package_tier: 'ENTERPRISE', sku_code: 'ENT', features: [] },
        child_subscriptions: [],
      });

      const result = await service.getSubscriptionByCompany('ext-1');

      expect(result.data.subscription_update).toMatchObject({
        max_clinics: -1, // unlimited
        max_users_per_clinic: 10,
      });
    });
  });

  describe('generateRenewalUrl', () => {
    beforeEach(() => {
      mockRepo.findSubscriptionByTokenAnyStatus.mockResolvedValue({ id: 1 });
      (jwt.sign as jest.Mock).mockReturnValue('signed-token');
    });

    it('should throw 404 when the subscription is missing', async () => {
      mockRepo.findSubscriptionByTokenAnyStatus.mockResolvedValue(null);

      await expect(
        service.generateRenewalUrl({ external_subscription_id: 'x', return_url: 'https://idental.com' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject a malformed return_url', async () => {
      await expect(
        service.generateRenewalUrl({ external_subscription_id: 'x', return_url: 'not-a-url' }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RETURN_URL' });
    });

    it('should reject a domain outside the allowlist (look-alike host)', async () => {
      await expect(
        service.generateRenewalUrl({
          external_subscription_id: 'x',
          return_url: 'https://evilidental.com/back',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RETURN_URL' });
    });

    it('should require https for idental domains', async () => {
      await expect(
        service.generateRenewalUrl({
          external_subscription_id: 'x',
          return_url: 'http://idental.com/back',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RETURN_URL' });
    });

    it('should allow localhost over http and return a signed renewal url', async () => {
      const result = await service.generateRenewalUrl({
        external_subscription_id: 'ext-1',
        return_url: 'http://localhost:3000/back',
      });

      expect(jwt.sign).toHaveBeenCalled();
      expect(result.renewal_url).toContain('token=signed-token');
      expect(result.expires_at).toBeDefined();
    });

    it('should allow a valid https idental subdomain', async () => {
      const result = await service.generateRenewalUrl({
        external_subscription_id: 'ext-1',
        return_url: 'https://app.idental.com/back',
      });

      expect(result.renewal_url).toContain('token=signed-token');
    });
  });

  describe('getQuotaDetails', () => {
    it('should delegate to the repository', async () => {
      mockRepo.getQuotaDetails.mockResolvedValue({ total: 5 });

      const result = await service.getQuotaDetails('ext-1', 'clinic');

      expect(mockRepo.getQuotaDetails).toHaveBeenCalledWith('ext-1', 'clinic');
      expect(result).toEqual({ total: 5 });
    });
  });
});
