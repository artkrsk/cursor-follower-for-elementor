import type { TScaleValue } from '../types'

/** Resolve a size string ('Npx' | 'N%' | 'cursor' | 'target') to a pixel size,
    or null when unresolvable. Module-private, pure. */
const refPx = (ref: string, baseSize: number, targetSize?: number): number | null => {
  if (ref === 'cursor') {
    return baseSize
  }
  if (ref === 'target') {
    return targetSize && targetSize > 0 ? targetSize : null
  }
  if (ref.endsWith('px')) {
    const parsed = Number.parseFloat(ref)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (ref.endsWith('%')) {
    // Percent of the base cursor size — the compact base-multiplier form
    // (120% = 1.2× base cursor).
    const parsed = Number.parseFloat(ref)
    return Number.isFinite(parsed) ? (parsed / 100) * baseSize : null
  }
  return null
}

/**
 * Does this size value reference the hovered element — directly, or through a
 * clamp bound? Callers measure the target only when this is true, so a hover
 * over a plain link never forces a layout read.
 */
export const usesTargetRef = (value: TScaleValue | false | null | undefined): boolean => {
  if (value === 'target') {
    return true
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return value.ref === 'target' || value.min === 'target' || value.max === 'target'
}

/**
 * The one canonical scale resolver — pure and contextless. Returns a scale
 * factor (ratio of the base cursor size), or null when unresolvable. See
 * TScaleValue for the grammar; `targetSize` (the hovered element's larger
 * dimension) is required for the 'target' reference.
 */
export function resolveScale(
  value: TScaleValue | false | undefined | null,
  baseSize: number,
  targetSize?: number
): number | null {
  if (value === undefined || value === null || value === false || baseSize <= 0) {
    return null
  }
  let px =
    typeof value === 'string'
      ? refPx(value, baseSize, targetSize)
      : refPx(value.ref, baseSize, targetSize)
  if (px === null) {
    return null
  }
  if (typeof value === 'object') {
    px *= value.factor ?? 1
    // Clamp bounds share the size grammar ('40px' | '120%' | 'cursor' | 'target');
    // a non-string (mis-authored) bound is ignored rather than throwing.
    const min = typeof value.min === 'string' ? refPx(value.min, baseSize, targetSize) : null
    const max = typeof value.max === 'string' ? refPx(value.max, baseSize, targetSize) : null
    if (min !== null) {
      px = Math.max(px, min)
    }
    if (max !== null) {
      px = Math.min(px, max)
    }
  }
  return px / baseSize
}
