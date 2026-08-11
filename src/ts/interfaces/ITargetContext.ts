import type { ICursorPayload } from './ICursorPayload'

export interface ITargetContext {
  element: Element
  /** Parsed payload, or null for bare interactives (links/buttons without the attribute). */
  payload: ICursorPayload | null
  /** The hover zone that produced this context — the pointer is inside it for
      the context's whole lifetime. Distinct from `element` when an anchor
      redirects the effect; the magnetic trap holds anywhere inside its rect. */
  trigger: Element
}
