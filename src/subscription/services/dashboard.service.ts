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

  async getDashboard() {
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
      this.userRepository.getUserStats(),
      this.subscriptionRepo.getSubscriptionStats(),
      this.transactionRepo.getRevenueStats(),
      this.orderRepo.getOrderStats(),
      this.subscriptionRepo.getPlanDistribution(),
      this.subscriptionRepo.getRecentSubscriptions(10),
      this.orderRepo.getRecentOrdersWithUsers(10),
      this.planSwitchRepo.getPlanSwitchStats(),
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
