import type { ICursorPayload } from './ICursorPayload'

export interface IEffectsSuite {
  /** Hover layer (delegated enter/leave). */
  setHover(payload: ICursorPayload, element: Element | null): void
  clearHover(): void
  /** Programmatic layer — returns a release function. */
  addSession(payload: ICursorPayload): () => void
  /** Returns the applied click-scale ratio, or null when the press is gated
      (click scale off, modified or secondary button) — the composition root
      forwards it to the magnetic trap so the engaged element shrinks along. */
  handlePress(e: PointerEvent): number | null
  /** True when this event lifts a primary press. */
  handleRelease(e: PointerEvent): boolean
  /** Re-sample the measured CSS environment (base size, hint padding, arrow
      box + gap, label boxes) and reapply the current state. The hover
      target's own size is deliberately NOT re-sampled — it is fixed per
      engagement (a mid-engagement read would include the magnetic element
      shrink) and re-reads on the next enter. */
  remeasure(): void
  dispose(): void
}
