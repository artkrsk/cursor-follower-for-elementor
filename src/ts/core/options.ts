import {
  DEFAULT_ANIMATION_DURATION,
  DEFAULT_ATTRIBUTE,
  DEFAULT_CLICK_FACTOR,
  DEFAULT_ELASTIC_MAX,
  DEFAULT_ELASTIC_STRENGTH,
  DEFAULT_HIGHLIGHT_SIZE_PX,
  DEFAULT_MAGNETIC_RELEASE_RADIUS,
  DEFAULT_MAGNETIC_STRENGTH,
  DEFAULT_TRAILING
} from '../constants'
import type { ICursorOptions, IResolvedOptions } from '../interfaces'

/**
 * One normalizer per feel section, shared by the initial resolve and the live
 * patch — a default is stated exactly once. Each is pure: `false` disables,
 * anything else fills the gaps.
 */

export const resolveElastic = (value: ICursorOptions['elastic']): IResolvedOptions['elastic'] =>
  value === false
    ? false
    : {
        strength: value?.strength ?? DEFAULT_ELASTIC_STRENGTH,
        max: value?.max ?? DEFAULT_ELASTIC_MAX
      }

export const resolveMagnetic = (value: ICursorOptions['magnetic']): IResolvedOptions['magnetic'] =>
  value === false
    ? false
    : {
        strength: value?.strength ?? DEFAULT_MAGNETIC_STRENGTH,
        releaseRadius: value?.releaseRadius ?? DEFAULT_MAGNETIC_RELEASE_RADIUS
      }

export const resolveHighlight = (
  value: ICursorOptions['highlight']
): IResolvedOptions['highlight'] =>
  value === false ? false : { scale: value?.scale ?? `${DEFAULT_HIGHLIGHT_SIZE_PX}px` }

export const resolveClickScale = (
  value: ICursorOptions['clickScale']
): IResolvedOptions['clickScale'] =>
  value === false
    ? false
    : { scale: value?.scale ?? { ref: 'cursor', factor: DEFAULT_CLICK_FACTOR } }

export function resolveOptions(user: ICursorOptions = {}): IResolvedOptions {
  return {
    trailing: user.trailing ?? DEFAULT_TRAILING,
    elastic: resolveElastic(user.elastic),
    magnetic: resolveMagnetic(user.magnetic),
    highlight: resolveHighlight(user.highlight),
    clickScale: resolveClickScale(user.clickScale),
    attribute: user.attribute ?? DEFAULT_ATTRIBUTE,
    targetScopes: user.targetScopes ?? [],
    animation: {
      duration: user.animation?.duration ?? DEFAULT_ANIMATION_DURATION,
      easing: user.animation?.easing ?? null
    }
  }
}

/**
 * Live feel patch. Mutates in place ON PURPOSE — the frame path holds this
 * exact object and reads it per frame, so the identity has to survive.
 * Structural options (attribute, targetScopes, root) are wired at init and are
 * deliberately not patchable. Animation is not user-patchable either: the
 * composition root overwrites it with the EFFECTIVE tokens measured off
 * computed CSS (at init and on remeasure()), so CSS owns the value and this
 * object just mirrors it for the JS timings.
 */
export function applyOptionPatch(options: IResolvedOptions, partial: ICursorOptions): void {
  if (partial.trailing !== undefined) {
    options.trailing = partial.trailing
  }
  if (partial.elastic !== undefined) {
    options.elastic = resolveElastic(partial.elastic)
  }
  if (partial.magnetic !== undefined) {
    options.magnetic = resolveMagnetic(partial.magnetic)
  }
  if (partial.highlight !== undefined) {
    options.highlight = resolveHighlight(partial.highlight)
  }
  if (partial.clickScale !== undefined) {
    options.clickScale = resolveClickScale(partial.clickScale)
  }
}
