import type { TArrowDirection } from '../types'

/** The engine's own root, and what it looks for when adopting existing markup. */
export const CURSOR_ID = 'arts-cursor'
/** Part names inside the cursor tree. */
export const EL_ATTR = 'data-arts-cursor-follower-element'
/** Default for `ICursorOptions.attribute` — the per-item payload attribute. */
export const DEFAULT_ATTRIBUTE = 'data-arts-cursor-follower-target'
export const SVG_NS = 'http://www.w3.org/2000/svg'
/** Spec-fixed, so it identifies an HTML element across realms — see utils/isElement. */
export const XHTML_NS = 'http://www.w3.org/1999/xhtml'
export const ARROW_ROTATION: Record<TArrowDirection, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270
}
