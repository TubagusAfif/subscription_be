/**
---------------------------------------------------------------
  Quota constants & helpers.

  Internally, "unlimited" is represented by the boolean `is_unlimited`
  flag on SkuBenefit / SubscriptionQuota — that flag is the ONLY thing
  enforcement reads, so we never do `used >= total` arithmetic against a
  magic number (which would silently block or allow everything).

  Outward-facing NUMERIC fields (API responses, the Domain 2 webhook /
  snapshot, dashboard available counts) cannot carry a boolean in place
  of a number, so they use the sentinel `UNLIMITED_QUOTA = -1` to mean
  "no cap". Consumers must treat any negative quota number as unlimited.
---------------------------------------------------------------
**/

/** Sentinel for numeric quota fields meaning "no cap". */
export const UNLIMITED_QUOTA = -1;

/** True when a numeric quota field carries the unlimited sentinel. */
export function isUnlimitedQuota(value: number | null | undefined): boolean {
  return typeof value === 'number' && value < 0;
}

/**
 * Render a stored quota as the outward numeric value: the sentinel when the
 * row is unlimited, otherwise the real total.
 */
export function toQuotaWire(isUnlimited: boolean, total: number): number {
  return isUnlimited ? UNLIMITED_QUOTA : total;
}
