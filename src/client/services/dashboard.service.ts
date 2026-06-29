import { UserRepository } from '../../shared/repositories/user.repository';
import { ClientSubscriptionRepository } from '../repositories/subscription.repository';
import { CoinWalletRepository } from '../repositories/coin-wallet.repository';
import { CoinTransactionRepository } from '../repositories/coin-transaction.repository';
import { OrderRepository } from '../../shared/repositories/order.repository';
import { BillingCycleRepository } from '../../shared/repositories/billing-cycle.repository';
import { ClientDashboardMapper } from '../mappers/dashboard.mapper';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface ClientDashboardServiceDeps {
  userRepository: UserRepository;
  clientSubscriptionRepository: ClientSubscriptionRepository;
  coinWalletRepository: CoinWalletRepository;
  coinTransactionRepository: CoinTransactionRepository;
  orderRepository: OrderRepository;
  billingCycleRepository: BillingCycleRepository;
}

export class ClientDashboardService {
  private readonly userRepository: UserRepository;
  private readonly subscriptionRepo: ClientSubscriptionRepository;
  private readonly walletRepo: CoinWalletRepository;
  private readonly transactionRepo: CoinTransactionRepository;
  private readonly orderRepo: OrderRepository;
  private readonly billingCycleRepo: BillingCycleRepository;

  constructor(deps: ClientDashboardServiceDeps) {
    this.userRepository = deps.userRepository;
    this.subscriptionRepo = deps.clientSubscriptionRepository;
    this.walletRepo = deps.coinWalletRepository;
    this.transactionRepo = deps.coinTransactionRepository;
    this.orderRepo = deps.orderRepository;
    this.billingCycleRepo = deps.billingCycleRepository;
  }

  async getDashboard(userId: number) {
    const [
      user,
      subscription,
      wallet,
      recentTransactions,
      recentOrders,
      recentBillingCycles,
      activeAddons,
      slotBreakdown,
      slotDetails,
    ] = await Promise.all([
      this.userRepository.findByIdWithProfile(userId),
      this.subscriptionRepo.findActiveByUserId(userId),
      this.walletRepo.findByUserIdWithCurrency(userId),
      this.transactionRepo.findRecentByUserId(userId, 5),
      this.orderRepo.findRecentByUserId(userId, 5),
      this.billingCycleRepo.findRecentByUserId(userId, 5),
      this.subscriptionRepo.findActiveAddonsByUserId(userId),
      this.subscriptionRepo.getSlotBreakdown(userId, 'clinic'),
      this.subscriptionRepo.getSlotDetails(userId, ['clinic', 'user']),
    ]);

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }

    return ClientDashboardMapper.toResponse({
      user,
      subscription,
      wallet,
      recentTransactions,
      recentOrders,
      recentBillingCycles,
      activeAddons,
      slotBreakdown,
      slotDetails,
    });
  }
}
