import type { IVec2 } from './IVec2'

/** A borrowed, mutable-internally view. Copy values before retaining them. */
export interface ICursorElementFrame {
  readonly trigger: HTMLElement | null
  readonly pointer: Readonly<IVec2>
  readonly position: Readonly<IVec2>
  readonly delta: Readonly<IVec2>
  /** Trigger-local CSS pixels and clamped fractions of its rendered box. */
  readonly local: Readonly<IVec2>
  readonly progress: Readonly<IVec2>
  readonly deltaTime: number
  readonly frameCount: number
  /** Eased visibility. Expansion can overshoot 1; collapse never goes below 0. */
  readonly reveal: number
  /** Aborted when this target interaction ends, including replacement/destruction. */
  readonly signal: AbortSignal
}
