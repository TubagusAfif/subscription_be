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

export type SlotSkuType = 'PACKAGE' | 'ADDON';

/** A capacity-contributing source before used/remaining are computed. */
export interface SlotSourceInput {
  subscription_id: number;
  sku_type: SlotSkuType;
  sku_id: number;
  sku_name: string;
  sku_code: string;
  capacity: number;
}

/** A source after package-first draining has assigned used/remaining. */
export interface SlotSource extends SlotSourceInput {
  used: number;
  remaining: number;
}

export interface SlotResourceDetail {
  resource_type: string;
  total_capacity: number;
  total_used: number;
  total_remaining: number;
  sources: SlotSource[];
}

/** Normalized package input (capacity read from SKU benefits). */
export interface PackageSlotInput {
  subscription_id: number;
  sku: { id: number; sku_name: string; sku_code: string };
  benefits: Array<{ benefit_type: string; max_usage: number | null }>;
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
    const capacity = Math.max(0, source.capacity);
    const sourceUsed = Math.min(capacity, remainingUsed);
    remainingUsed -= sourceUsed;
    return { ...source, capacity, used: sourceUsed, remaining: capacity - sourceUsed };
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
  const totalCapacity = drained.reduce((sum, s) => sum + s.capacity, 0);
  const totalUsed = Math.max(0, Math.trunc(used));
  return {
    resource_type: resourceType,
    total_capacity: totalCapacity,
    total_used: totalUsed,
    total_remaining: totalCapacity - totalUsed,
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
      const capacity = pkg.benefits.find((b) => b.benefit_type === resourceType)?.max_usage ?? 0;
      sources.push({
        subscription_id: pkg.subscription_id,
        sku_type: 'PACKAGE',
        sku_id: pkg.sku.id,
        sku_name: pkg.sku.sku_name,
        sku_code: pkg.sku.sku_code,
        capacity,
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
