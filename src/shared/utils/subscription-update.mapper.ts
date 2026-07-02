import { SubscriptionUpdate } from '../types/webhook.types';
import { PlanWithRelations } from '../repositories/plan.repository';
import { UNLIMITED_QUOTA } from '../constants/quota.constants';

/**
 * Maps a Domain 1 SKU + billing window into the `subscription_update` block that
 * Domain 2 expects on the wire. Kept deliberately consistent with the snapshot
 * built by `InternalService.getSubscriptionByCompany` (the GET /subscriptions
 * endpoint) so a live `created`/`upgraded` event and a later `sync` describe the
 * same company identically:
 *   - tier      → lowercased package_tier (defaults to 'basic')
 *   - max_*     → from the 'clinic' / 'user' SKU benefits; -1 means unlimited
 *   - features  → SkuFeature.feature codes
 *   - trial_end → billing_end when the sku_code looks like a trial, else null
 */

/** Format a Date as YYYY-MM-DD (or null), matching the snapshot endpoint. */
function toYmd(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Pull the feature string codes off a SKU, tolerant of a missing relation. */
export function extractFeatures(sku: { features?: { feature: string }[] | null }): string[] {
  return (sku.features ?? []).map((f) => f.feature);
}

/**
 * Build a FULL subscription_update (every field present) for a package SKU.
 * Returns `Required<SubscriptionUpdate>` so it satisfies the `created`/`sync`
 * formatters that demand the complete state, while remaining assignable to the
 * partial-update formatters (`upgraded`/`downgraded`).
 */
export function buildSubscriptionUpdate(
  sku: PlanWithRelations,
  status: string,
  billingStart: Date,
  billingEnd: Date,
): Required<SubscriptionUpdate> {
  const benefits = sku.benefits ?? [];
  const clinicBenefit = benefits.find((b) => b.benefit_type === 'clinic');
  const userBenefit = benefits.find((b) => b.benefit_type === 'user');
  const isTrial = sku.sku_code?.toLowerCase().includes('trial') ?? false;
  const billingEndYmd = toYmd(billingEnd);

  return {
    tier: sku.package_tier?.toLowerCase() ?? 'basic',
    status,
    max_clinics: clinicBenefit?.is_unlimited ? UNLIMITED_QUOTA : (clinicBenefit?.max_usage ?? 0),
    max_users_per_clinic: userBenefit?.is_unlimited
      ? UNLIMITED_QUOTA
      : (userBenefit?.max_usage ?? 0),
    features: extractFeatures(sku),
    addons: {},
    billing_start: toYmd(billingStart),
    billing_end: billingEndYmd,
    trial_end: isTrial ? billingEndYmd : null,
  };
}
