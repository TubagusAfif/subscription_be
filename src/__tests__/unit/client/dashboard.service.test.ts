import { ClientDashboardService } from '../../../client/services/dashboard.service';
import { ClientDashboardMapper } from '../../../client/mappers/dashboard.mapper';

jest.mock('../../../client/mappers/dashboard.mapper');

describe('ClientDashboardService', () => {
  let service: ClientDashboardService;

  const mockUserRepo = { findByIdWithProfile: jest.fn() };
  const mockSubscriptionRepo = {
    findActiveByUserId: jest.fn(),
    findActiveAddonsByUserId: jest.fn(),
    getSlotBreakdown: jest.fn(),
    getSlotDetails: jest.fn(),
  };
  const mockWalletRepo = { findByUserIdWithCurrency: jest.fn() };
  const mockTransactionRepo = { findRecentByUserId: jest.fn() };
  const mockOrderRepo = { findRecentByUserId: jest.fn() };
  const mockBillingCycleRepo = { findRecentByUserId: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepo.findByIdWithProfile.mockResolvedValue({ id: 1, name: 'Alice' });
    mockSubscriptionRepo.findActiveByUserId.mockResolvedValue({ id: 5 });
    mockSubscriptionRepo.findActiveAddonsByUserId.mockResolvedValue([]);
    mockSubscriptionRepo.getSlotBreakdown.mockResolvedValue({
      packageSlots: 2,
      addonSlots: 0,
      totalSlots: 2,
      usedSlots: 0,
      availableSlots: 2,
    });
    mockSubscriptionRepo.getSlotDetails.mockResolvedValue([
      {
        resource_type: 'clinic',
        total_capacity: 2,
        total_used: 0,
        total_remaining: 2,
        sources: [
          {
            subscription_id: 5,
            sku_type: 'PACKAGE',
            sku_id: 10,
            sku_name: 'Pro',
            sku_code: 'PRO',
            capacity: 2,
            used: 0,
            remaining: 2,
          },
        ],
      },
      {
        resource_type: 'user',
        total_capacity: 5,
        total_used: 0,
        total_remaining: 5,
        sources: [
          {
            subscription_id: 5,
            sku_type: 'PACKAGE',
            sku_id: 10,
            sku_name: 'Pro',
            sku_code: 'PRO',
            capacity: 5,
            used: 0,
            remaining: 5,
          },
        ],
      },
    ]);
    mockWalletRepo.findByUserIdWithCurrency.mockResolvedValue({ balance: 100 });
    mockTransactionRepo.findRecentByUserId.mockResolvedValue([]);
    mockOrderRepo.findRecentByUserId.mockResolvedValue([]);
    mockBillingCycleRepo.findRecentByUserId.mockResolvedValue([]);
    (ClientDashboardMapper.toResponse as jest.Mock).mockReturnValue({ ok: true });

    service = new ClientDashboardService({
      userRepository: mockUserRepo as any,
      clientSubscriptionRepository: mockSubscriptionRepo as any,
      coinWalletRepository: mockWalletRepo as any,
      coinTransactionRepository: mockTransactionRepo as any,
      orderRepository: mockOrderRepo as any,
      billingCycleRepository: mockBillingCycleRepo as any,
    });
  });

  it('should aggregate user data and return the mapped response', async () => {
    const result = await service.getDashboard(1);

    expect(mockUserRepo.findByIdWithProfile).toHaveBeenCalledWith(1);
    expect(mockTransactionRepo.findRecentByUserId).toHaveBeenCalledWith(1, 5);
    expect(mockOrderRepo.findRecentByUserId).toHaveBeenCalledWith(1, 5);
    expect(mockBillingCycleRepo.findRecentByUserId).toHaveBeenCalledWith(1, 5);
    expect(mockSubscriptionRepo.findActiveAddonsByUserId).toHaveBeenCalledWith(1);
    expect(mockSubscriptionRepo.getSlotBreakdown).toHaveBeenCalledWith(1, 'clinic');
    expect(mockSubscriptionRepo.getSlotDetails).toHaveBeenCalledWith(1, ['clinic', 'user']);
    expect(ClientDashboardMapper.toResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 1, name: 'Alice' },
        subscription: { id: 5 },
        activeAddons: [],
        slotBreakdown: expect.objectContaining({
          packageSlots: 2,
          addonSlots: 0,
          totalSlots: 2,
          usedSlots: 0,
          availableSlots: 2,
        }),
        slotDetails: expect.arrayContaining([
          expect.objectContaining({ resource_type: 'clinic' }),
          expect.objectContaining({ resource_type: 'user' }),
        ]),
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('should throw 404 USER_NOT_FOUND when the user does not exist', async () => {
    mockUserRepo.findByIdWithProfile.mockResolvedValue(null);

    await expect(service.getDashboard(1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
    expect(ClientDashboardMapper.toResponse).not.toHaveBeenCalled();
  });
});
