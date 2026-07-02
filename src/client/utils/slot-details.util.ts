/**
---------------------------------------------------------------
  Slot detail computation (pure, no I/O).

  Subscription quota is stored as a single aggregate counter per
  (package_subscription, resource_type): `total_quota` is the sum of the
  package benefit plus every active add-on's `quota_value`, and `used_quota`
  is one shared counter incremented on each slot assignment. There is no
  per-add-on "used" count persisted anywhere.

  To present a per-source breakdown we therefore DERIVE each source's used
  slots by draining the authoritative aggregate `used_quota` across the
  sources in a fixed order: the package first, then add-ons in purchase
  order (oldest first). This is a display-only attribution; the
  authoritative numbers remain in `SubscriptionQuota`.
---------------------------------------------------------------
**/

import { UNLIMITED_QUOTA } from '../../shared/constants/quota.constants';

export type SlotSkuType = 'PACKAGE' | 'ADDON';

/** A capacity-contributing source before used/remaining are computed. When
 *  `is_unlimited` is set the `capacity` field is meaningless and reported as
 *  the UNLIMITED_QUOTA sentinel. Only package sources can be unlimited. */
export interface SlotSourceInput {
  subscription_id: number;
  sku_type: SlotSkuType;
  sku_id: number;
  sku_name: string;
  sku_code: string;
  capacity: number;
  is_unlimited?: boolean;
}

/** A source after package-first draining has assigned used/remaining. */
export interface SlotSource extends SlotSourceInput {
  is_unlimited: boolean;
  used: number;
  remaining: number;
}

export interface SlotResourceDetail {
  resource_type: string;
  is_unlimited: boolean;
  total_capacity: number;
  total_used: number;
  total_remaining: number;
  sources: SlotSource[];
}

/** Normalized package input (capacity read from SKU benefits). */
export interface PackageSlotInput {
  subscription_id: number;
  sku: { id: number; sku_name: string; sku_code: string };
  benefits: Array<{ benefit_type: string; max_usage: number | null; is_unlimited?: boolean }>;
}

/** Normalized add-on input (capacity read from SKU add-ons, the same source
 *  the purchase flow uses to increment `total_quota`). */
export interface AddonSlotInput {
  subscription_id: number;
  sku: { id: number; sku_name: string; sku_code: string };
  addons: Array<{ resource_type: string; quota_value: number }>;
}

/** Maps an add-on resource enum (e.g. `CLINIC_ADDON`) to a quota resource
 *  type (e.g. `clinic`), matching `subscribe()`'s `replace('_ADDON','')`. */
export function addonResourceToQuotaType(resourceType: string): string {
  return resourceType.replace('_ADDON', '').toLowerCase();
}

/**
 * Attribute `used` slots across ordered sources, package first. Each source
 * absorbs up to its capacity before the next one receives any. Negative
 * inputs are clamped to 0; leftover used beyond total capacity is left
 * unattributed (surfaced only via the group's `total_remaining`).
 */
export function drainSources(sources: SlotSourceInput[], used: number): SlotSource[] {
  let remainingUsed = Math.max(0, Math.trunc(used));
  return sources.map((source) => {
    // An unlimited source absorbs all remaining used slots and reports the
    // sentinel for capacity/remaining — there is no finite cap to drain against.
    if (source.is_unlimited) {
      const sourceUsed = remainingUsed;
      remainingUsed = 0;
      return {
        ...source,
        is_unlimited: true,
        capacity: UNLIMITED_QUOTA,
        used: sourceUsed,
        remaining: UNLIMITED_QUOTA,
      };
    }
    const capacity = Math.max(0, source.capacity);
    const sourceUsed = Math.min(capacity, remainingUsed);
    remainingUsed -= sourceUsed;
    return {
      ...source,
      is_unlimited: false,
      capacity,
      used: sourceUsed,
      remaining: capacity - sourceUsed,
    };
  });
}

/** Builds a single resource-type group from ordered sources and the
 *  authoritative used count. */
export function buildSlotResourceDetail(
  resourceType: string,
  sources: SlotSourceInput[],
  used: number,
): SlotResourceDetail {
  const drained = drainSources(sources, used);
  const isUnlimited = drained.some((s) => s.is_unlimited);
  const totalUsed = Math.max(0, Math.trunc(used));
  // When any source is unlimited the whole group is uncapped; sum only the
  // finite sources for display but report capacity/remaining as the sentinel.
  const finiteCapacity = drained
    .filter((s) => !s.is_unlimited)
    .reduce((sum, s) => sum + s.capacity, 0);
  return {
    resource_type: resourceType,
    is_unlimited: isUnlimited,
    total_capacity: isUnlimited ? UNLIMITED_QUOTA : finiteCapacity,
    total_used: totalUsed,
    total_remaining: isUnlimited ? UNLIMITED_QUOTA : finiteCapacity - totalUsed,
    sources: drained,
  };
}

/**
 * Builds the per-resource slot detail array. The package is always listed as
 * a source for every requested resource type (capacity 0 when it has no
 * benefit for that type); an add-on is listed only for resource types it
 * actually contributes capacity to. Add-ons must be pre-sorted oldest-first
 * so draining is deterministic and stable across requests.
 */
export function buildSlotDetails(
  resourceTypes: string[],
  pkg: PackageSlotInput | null,
  addons: AddonSlotInput[],
  usedByResource: Record<string, number>,
): SlotResourceDetail[] {
  return resourceTypes.map((resourceType) => {
    const sources: SlotSourceInput[] = [];

    if (pkg) {
      const benefit = pkg.benefits.find((b) => b.benefit_type === resourceType);
      sources.push({
        subscription_id: pkg.subscription_id,
        sku_type: 'PACKAGE',
        sku_id: pkg.sku.id,
        sku_name: pkg.sku.sku_name,
        sku_code: pkg.sku.sku_code,
        capacity: benefit?.max_usage ?? 0,
        is_unlimited: benefit?.is_unlimited ?? false,
      });
    }

    for (const addon of addons) {
      const capacity = addon.addons
        .filter((a) => addonResourceToQuotaType(a.resource_type) === resourceType)
        .reduce((sum, a) => sum + (a.quota_value ?? 0), 0);
      if (capacity > 0) {
        sources.push({
          subscription_id: addon.subscription_id,
          sku_type: 'ADDON',
          sku_id: addon.sku.id,
          sku_name: addon.sku.sku_name,
          sku_code: addon.sku.sku_code,
          capacity,
        });
      }
    }

    return buildSlotResourceDetail(resourceType, sources, usedByResource[resourceType] ?? 0);
  });
}
