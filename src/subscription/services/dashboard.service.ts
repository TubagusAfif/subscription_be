import { AdminDashboardMapper } from '../mappers/dashboard.mapper';
import { UserRepository } from '../../shared/repositories/user.repository';
import { AdminSubscriptionRepository } from '../repositories/subscription.repository';
import { CoinTransactionRepository } from '../../client/repositories/coin-transaction.repository';
import { CoinOrderRepository } from '../../client/repositories/coin-order.repository';
import { PlanSwitchRepository } from '../../shared/repositories/plan-switch.repository';

export interface AdminDashboardServiceDeps {
  userRepository: UserRepository;
  subscriptionRepository: AdminSubscriptionRepository;
  coinTransactionRepository: CoinTransactionRepository;
  coinOrderRepository: CoinOrderRepository;
  planSwitchRepository: PlanSwitchRepository;
}

export class AdminDashboardService {
  private readonly userRepository: UserRepository;
  private readonly subscriptionRepo: AdminSubscriptionRepository;
  private readonly transactionRepo: CoinTransactionRepository;
  private readonly orderRepo: CoinOrderRepository;
  private readonly planSwitchRepo: PlanSwitchRepository;

  constructor(deps: AdminDashboardServiceDeps) {
    this.userRepository = deps.userRepository;
    this.subscriptionRepo = deps.subscriptionRepository;
    this.transactionRepo = deps.coinTransactionRepository;
    this.orderRepo = deps.coinOrderRepository;
    this.planSwitchRepo = deps.planSwitchRepository;
  }

  async getDashboard(month?: number, year?: number, limit: number = 10) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month || year) {
      const currentYear = new Date().getFullYear();
      const y = year || currentYear;
      if (month) {
        startDate = new Date(Date.UTC(y, month - 1, 1));
        endDate = new Date(Date.UTC(y, month, 1));
      } else {
        startDate = new Date(Date.UTC(y, 0, 1));
        endDate = new Date(Date.UTC(y + 1, 0, 1));
      }
    }

    const [
      userStats,
      subscriptionStats,
      revenueStats,
      orderStats,
      planDistribution,
      recentSubscriptions,
      recentCoinOrders,
      planSwitchStats,
    ] = await Promise.all([
      this.userRepository.getUserStats(startDate, endDate),
      this.subscriptionRepo.getSubscriptionStats(startDate, endDate),
      this.transactionRepo.getRevenueStats(startDate, endDate),
      this.orderRepo.getOrderStats(startDate, endDate),
      this.subscriptionRepo.getPlanDistribution(startDate, endDate),
      this.subscriptionRepo.getRecentSubscriptions(limit, startDate, endDate),
      this.orderRepo.getRecentOrdersWithUsers(limit, startDate, endDate),
      this.planSwitchRepo.getPlanSwitchStats(startDate, endDate),
    ]);

    return AdminDashboardMapper.toResponse({
      userStats,
      subscriptionStats,
      revenueStats: { ...revenueStats, ...orderStats },
      planDistribution,
      recentSubscriptions,
      recentCoinOrders,
      planSwitchStats,
    });
  }
}
