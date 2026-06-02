interface UserStats {
  total_users: number;
  active_users: number;
  new_users_this_month: number;
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  cancelled_subscriptions: number;
  expired_subscriptions: number;
}

interface RevenueStats {
  total_coins_purchased: any;
  total_coins_spent: any;
  total_coin_orders: number;
  paid_coin_orders: number;
}

interface PlanDistributionItem {
  plan_name: string;
  plan_tier: string | null;
  active_count: number;
}

interface PlanSwitchStats {
  total_switches: number;
  upgrades: number;
  downgrades: number;
  crossgrades: number;
}

interface DashboardData {
  userStats: UserStats;
  subscriptionStats: SubscriptionStats;
  revenueStats: RevenueStats;
  planDistribution: PlanDistributionItem[];
  recentSubscriptions: any[];
  recentCoinOrders: any[];
  planSwitchStats: PlanSwitchStats;
}

export class AdminDashboardMapper {
  static toResponse(data: DashboardData) {
    return {
      user_stats: {
        total_users: data.userStats.total_users,
        active_users: data.userStats.active_users,
        new_users_this_month: data.userStats.new_users_this_month,
      },
      subscription_stats: {
        total_subscriptions: data.subscriptionStats.total_subscriptions,
        active_subscriptions: data.subscriptionStats.active_subscriptions,
        cancelled_subscriptions: data.subscriptionStats.cancelled_subscriptions,
        expired_subscriptions: data.subscriptionStats.expired_subscriptions,
      },
      revenue_stats: {
        total_coins_purchased: Number(data.revenueStats.total_coins_purchased ?? 0),
        total_coins_spent: Number(data.revenueStats.total_coins_spent ?? 0),
        total_coin_orders: data.revenueStats.total_coin_orders,
        paid_coin_orders: data.revenueStats.paid_coin_orders,
      },
      plan_distribution: data.planDistribution.map((item) => ({
        plan_name: item.plan_name,
        plan_tier: item.plan_tier,
        active_count: item.active_count,
      })),
      recent_subscriptions: data.recentSubscriptions.map((sub) => ({
        id: sub.id,
        user_name: sub.user.name,
        user_email: sub.user.email,
        plan_name: sub.sku.sku_name,
        plan_tier: sub.sku.package_tier,
        status: sub.status,
        created_at: sub.created_at,
      })),
      recent_coin_orders: data.recentCoinOrders.map((order) => ({
        id: order.id,
        user_name: order.user.name,
        user_email: order.user.email,
        coin_amount: order.coin_amount,
        price_paid: Number(order.price_paid),
        tax_amount: Number(order.tax_amount),
        status: order.status,
        created_at: order.created_at,
      })),
      plan_switch_summary: {
        total_switches: data.planSwitchStats.total_switches,
        upgrades: data.planSwitchStats.upgrades,
        downgrades: data.planSwitchStats.downgrades,
        crossgrades: data.planSwitchStats.crossgrades,
      },
    };
  }
}
