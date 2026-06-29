import { AdminDashboardService } from '../../../subscription/services/dashboard.service';
import { AdminDashboardMapper } from '../../../subscription/mappers/dashboard.mapper';

jest.mock('../../../subscription/mappers/dashboard.mapper');

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const mockUserRepo = { getUserStats: jest.fn() };
  const mockSubscriptionRepo = {
    getSubscriptionStats: jest.fn(),
    getPlanDistribution: jest.fn(),
    getRecentSubscriptions: jest.fn(),
  };
  const mockTransactionRepo = { getRevenueStats: jest.fn() };
  const mockOrderRepo = { getOrderStats: jest.fn(), getRecentOrdersWithUsers: jest.fn() };
  const mockPlanSwitchRepo = { getPlanSwitchStats: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepo.getUserStats.mockResolvedValue({ total: 10 });
    mockSubscriptionRepo.getSubscriptionStats.mockResolvedValue({ active: 5 });
    mockTransactionRepo.getRevenueStats.mockResolvedValue({ revenue: 100 });
    mockOrderRepo.getOrderStats.mockResolvedValue({ orders: 3 });
    mockSubscriptionRepo.getPlanDistribution.mockResolvedValue([]);
    mockSubscriptionRepo.getRecentSubscriptions.mockResolvedValue([]);
    mockOrderRepo.getRecentOrdersWithUsers.mockResolvedValue([]);
    mockPlanSwitchRepo.getPlanSwitchStats.mockResolvedValue({ switches: 0 });
    (AdminDashboardMapper.toResponse as jest.Mock).mockReturnValue({ ok: true });

    service = new AdminDashboardService({
      userRepository: mockUserRepo as any,
      subscriptionRepository: mockSubscriptionRepo as any,
      coinTransactionRepository: mockTransactionRepo as any,
      coinOrderRepository: mockOrderRepo as any,
      planSwitchRepository: mockPlanSwitchRepo as any,
    });
  });

  it('should aggregate all stats with no date range when month/year are omitted', async () => {
    const result = await service.getDashboard();

    expect(mockUserRepo.getUserStats).toHaveBeenCalledWith(undefined, undefined);
    expect(mockOrderRepo.getRecentOrdersWithUsers).toHaveBeenCalledWith(10, undefined, undefined);
    expect(AdminDashboardMapper.toResponse).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it('should merge revenueStats and orderStats before mapping', async () => {
    await service.getDashboard();

    expect(AdminDashboardMapper.toResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        revenueStats: { revenue: 100, orders: 3 },
      }),
    );
  });

  it('should compute a month range (UTC) when month and year are provided', async () => {
    await service.getDashboard(3, 2025);

    const start = new Date(Date.UTC(2025, 2, 1));
    const end = new Date(Date.UTC(2025, 3, 1));
    expect(mockUserRepo.getUserStats).toHaveBeenCalledWith(start, end);
  });

  it('should compute a full-year range when only year is provided', async () => {
    await service.getDashboard(undefined, 2024);

    const start = new Date(Date.UTC(2024, 0, 1));
    const end = new Date(Date.UTC(2025, 0, 1));
    expect(mockSubscriptionRepo.getSubscriptionStats).toHaveBeenCalledWith(start, end);
  });

  it('should pass a custom limit through to the recent-records queries', async () => {
    await service.getDashboard(undefined, undefined, 25);

    expect(mockSubscriptionRepo.getRecentSubscriptions).toHaveBeenCalledWith(25, undefined, undefined);
    expect(mockOrderRepo.getRecentOrdersWithUsers).toHaveBeenCalledWith(25, undefined, undefined);
  });
});
