/**
---------------------------------------------------------------
  Mapper for Client Dashboard API response.
  Converts raw Prisma data into a clean, structured response.
  All Decimal fields are cast with Number().
---------------------------------------------------------------
**/
export class ClientDashboardMapper {
  static toResponse(data: {
    user: any;
    subscription: any;
    wallet: any;
    recentTransactions: any[];
    recentOrders: any[];
    recentBillingCycles: any[];
    activeAddons: any[];
    slotBreakdown: any;
    slotDetails?: any[];
  }) {
    return {
      profile: ClientDashboardMapper.mapProfile(data.user),
      active_subscription: ClientDashboardMapper.mapSubscription(data.subscription, data.activeAddons),
      slot_breakdown: data.slotBreakdown,
      slot_details: data.slotDetails ?? [],
      wallet: ClientDashboardMapper.mapWallet(data.wallet),
      recent_transactions: data.recentTransactions.map(ClientDashboardMapper.mapTransaction),
      recent_orders: data.recentOrders.map(ClientDashboardMapper.mapOrder),
      billing: ClientDashboardMapper.mapBilling(data.recentBillingCycles, data.subscription),
    };
  }

  private static mapProfile(user: any) {
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      phone: user.phone,
      clinic_name: user.profile?.clinic_name ?? null,
      photo_url: user.profile?.photo_url ?? null,
      city: user.profile?.city ?? null,
      province: user.profile?.province ?? null,
      country: user.profile?.country ?? null,
    };
  }

  private static mapSubscription(subscription: any, activeAddons: any[] = []) {
    if (!subscription) return null;
    return {
      id: subscription.id,
      status: subscription.status,
      auto_renew: subscription.auto_renew,
      current_billing_start: subscription.current_billing_start,
      current_billing_end: subscription.current_billing_end,
      next_billing_date: subscription.next_billing_date,
      plan: subscription.sku
        ? {
            id: subscription.sku.id,
            sku_name: subscription.sku.sku_name,
            sku_code: subscription.sku.sku_code,
            package_tier: subscription.sku.package_tier,
            coin_cost: Number(subscription.sku.coin_cost),
            billing_duration_days: subscription.sku.billing_duration_days,
          }
        : null,
      quotas: Array.isArray(subscription.quotas)
        ? subscription.quotas.map((q: any) => ({
            id: q.id,
            resource_type: q.resource_type,
            total_quota: q.total_quota,
            used_quota: q.used_quota,
            available_quota: q.total_quota - q.used_quota,
          }))
        : [],
      active_addons: Array.isArray(activeAddons)
        ? activeAddons.map((addon: any) => ({
            id: addon.id,
            status: addon.status,
            current_billing_start: addon.current_billing_start,
            current_billing_end: addon.current_billing_end,
            sku: addon.sku
              ? {
                  id: addon.sku.id,
                  sku_name: addon.sku.sku_name,
                  sku_code: addon.sku.sku_code,
                  coin_cost: Number(addon.sku.coin_cost),
                }
              : null,
          }))
        : [],
    };
  }

  private static mapWallet(wallet: any) {
    if (!wallet) return null;
    return {
      id: wallet.id,
      balance: Number(wallet.balance),
      last_updated: wallet.last_updated,
      currency: wallet.currency
        ? {
            id: wallet.currency.id,
            currency_name: wallet.currency.currency_name,
            currency_code: wallet.currency.currency_code,
            symbol: wallet.currency.symbol,
          }
        : null,
    };
  }

  private static mapTransaction(tx: any) {
    return {
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      description: tx.description,
      created_at: tx.created_at,
    };
  }

  private static mapOrder(order: any) {
    return {
      id: order.id,
      order_number: order.order_number,
      coin_amount: order.coin_amount,
      status: order.status,
      created_at: order.created_at,
      sku: order.sku
        ? {
            id: order.sku.id,
            sku_name: order.sku.sku_name,
            sku_code: order.sku.sku_code,
            sku_type: order.sku.sku_type,
            package_tier: order.sku.package_tier,
          }
        : null,
    };
  }

  private static mapBilling(billingCycles: any[], subscription: any) {
    return {
      next_billing_date: subscription?.next_billing_date ?? null,
      recent_cycles: billingCycles.map((cycle: any) => ({
        id: cycle.id,
        cycle_start: cycle.cycle_start,
        cycle_end: cycle.cycle_end,
        status: cycle.status,
        created_at: cycle.created_at,
      })),
    };
  }
}
