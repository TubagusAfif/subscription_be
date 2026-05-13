import { PlanWithRelations } from '../repositories/plan.repository';

/** 
---------------------------------------------------------------
  Maps a raw Plan (SkuBase) and its relations into a cohesive API response.
---------------------------------------------------------------
**/
export class PlanMapper {
  /** 
  ---------------------------------------------------------------
    Formats a single plan into the standardized API response structure.
  ---------------------------------------------------------------
  **/
  static toResponse(plan: PlanWithRelations) {
    return {
      id: plan.id,
      sku_name: plan.sku_name,
      sku_code: plan.sku_code,
      sku_type: plan.sku_type,
      package_tier: plan.package_tier,
      rank: plan.rank,
      billing_duration_days: plan.billing_duration_days,
      coin_cost: plan.coin_cost,
      is_active: plan.is_active,
      created_at: plan.created_at,
      created_by: plan.created_by,
      updated_at: plan.updated_at,
      updated_by: plan.updated_by,
      benefits: plan.benefits,
      features: plan.features,
      addons: plan.addons,
    };
  }

  /** 
  ---------------------------------------------------------------
    Formats an array of plans into the standardized API response structure.
  ---------------------------------------------------------------
  **/
  static toListResponse(plans: PlanWithRelations[]) {
    return plans.map((plan) => this.toResponse(plan));
  }
}
