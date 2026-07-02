import { Subscription } from '@prisma/client';
import { UNLIMITED_QUOTA } from '../../shared/constants/quota.constants';

export class SubscriptionMapper {
  static toResponse(subscription: Subscription) {
    return {
      id: subscription.id,
      user_id: subscription.user_id,
      sku_id: subscription.sku_id,
      sku_type: subscription.sku_type,
      status: subscription.status,
      auto_renew: subscription.auto_renew,
      current_billing_start: subscription.current_billing_start,
      current_billing_end: subscription.current_billing_end,
      next_billing_date: subscription.next_billing_date,
      canceled_at: subscription.canceled_at,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    };
  }

  static toDetailResponse(subscription: any) {
    return {
      ...SubscriptionMapper.toResponse(subscription),
      sku: subscription.sku
        ? {
            id: subscription.sku.id,
            sku_name: subscription.sku.sku_name,
            sku_code: subscription.sku.sku_code,
            sku_type: subscription.sku.sku_type,
            package_tier: subscription.sku.package_tier,
            coin_cost: Number(subscription.sku.coin_cost),
            billing_duration_days: subscription.sku.billing_duration_days,
          }
        : null,
      quotas: subscription.quotas
        ? subscription.quotas.map((q: any) => ({
            id: q.id,
            resource_type: q.resource_type,
            is_unlimited: q.is_unlimited ?? false,
            total_quota: q.is_unlimited ? UNLIMITED_QUOTA : q.total_quota,
            used_quota: q.used_quota,
          }))
        : [],
    };
  }
}
