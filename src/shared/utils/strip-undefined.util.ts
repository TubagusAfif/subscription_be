/**
 * Recursively removes `undefined` from every property value in a type,
 * walking into nested objects and array element types.
 *
 * Flat fields:
 *   { name?: string | undefined }  →  { name?: string }
 *
 * Nested arrays:
 *   { items: { value?: string | null | undefined }[] }
 *   →  { items: { value?: string | null }[] }
 */
type DeepStripUndefined<T> = T extends (infer U)[]
  ? DeepStripUndefined<U>[]
  : T extends Record<string, unknown>
    ? { [K in keyof T]: DeepStripUndefined<Exclude<T[K], undefined>> }
    : Exclude<T, undefined>;

/**
 * Deep-strip keys whose value is `undefined` from an object (and its nested
 * children).
 *
 * Zod marks optional fields as `T | undefined`, but Prisma's
 * `exactOptionalPropertyTypes` requires `T` (without `undefined`).
 * Passing the body through this helper removes undefined entries so the
 * remaining keys satisfy Prisma's stricter input types.
 *
 * @example
 *   stripUndefined({ name: 'foo', age: undefined, items: [{ v: undefined }] })
 *   // → { name: 'foo', items: [{}] }
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): DeepStripUndefined<T> {
  return _deepStrip(obj) as DeepStripUndefined<T>;
}

function _deepStrip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(_deepStrip);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        result[k] = _deepStrip(v);
      }
    }
    return result;
  }
  return value;
}
