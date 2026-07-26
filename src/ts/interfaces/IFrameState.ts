import type { IVec2 } from './IVec2'

/**
 * Preallocated per-frame state. Every vector is mutated in place —
 * nothing on the frame path allocates.
 */
export interface IFrameState {
  /** Latest pointer position, viewport space. */
  mouseClient: IVec2
  /** Current scroll offset, maintained by a passive scroll listener. */
  scroll: IVec2
  /** Follower target — viewport space in free-roam (mouse), page space when magnetic-composed. */
  target: IVec2
  /** Follower position, same space as the target — the lerp integrates here. */
  follower: IVec2
  /** target − follower; drives elastic squash. */
  lag: IVec2
  /** True once the first pointermove arrived (reveal gate). */
  pointerSeen: boolean
}
