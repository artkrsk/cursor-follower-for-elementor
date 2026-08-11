import { XHTML_NS } from '../constants'
import type { TStyledElement } from '../types'

/**
 * Cross-realm-safe DOM guards. `instanceof` fails for elements from a different
 * frame (e.g. Elementor's preview iframe) — each frame has its own constructor
 * set — so every check here reads host-DOM data that is identical across
 * frames: `nodeType`, the spec-fixed namespace string, property presence.
 */

export function isElement(value: unknown): value is Element {
  return typeof value === 'object' && value !== null && (value as Node).nodeType === 1
}

/** HTML as opposed to SVG/MathML — for what needs the HTMLElement surface
    (offsetParent, the cursor root). */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return isElement(value) && value.namespaceURI === XHTML_NS
}

/** Writable inline style — see TStyledElement for why SVG counts. */
export function isStyledElement(value: unknown): value is TStyledElement {
  return isElement(value) && 'style' in value
}
