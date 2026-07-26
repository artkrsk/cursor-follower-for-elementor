import { CONVERGE_EPS, FRAME_60 } from '../constants'
import type { IFollowerPipeline, IFrameState } from '../interfaces'
import { lerpFactor } from '../utils'

/**
 * The frame pipeline: frame-rate-corrected exponential smoothing toward the
 * composed target, lag derivation, elastic, convergence idle.
 *
 * Space semantics: free-roam runs in viewport space (scroll never moves the
 * cursor away from the pointer). Magnetic engagement switches the composition
 * to page space and subtracts scroll at render time, outside the lerp — which
 * is what keeps the cursor glued while the page scrolls.
 *
 * Don't reach for WAAPI retargeting here: it read worse than the lerp in a
 * live feel comparison with no visible gain, and canceling its newest
 * fill-forwards animation resurrected earlier still-running ones (only
 * finished animations are auto-removed on replacement), doubling the position
 * during magnetic handoff.
 */

export function createFollowerPipeline(args: {
  state: IFrameState
  getTrailing: () => number
  /** Writes state.target (free-roam: mouseClient; magnetic composes its own). */
  composeTarget: (dt: number) => void
  /** Paints the follower position. */
  renderPosition: (x: number, y: number) => void
  /** Advances elastic; returns true when visually settled. */
  applyElastic: () => boolean
  /** Commits the frame's accumulated translate + matrix as one write. */
  flush: () => void
  /** May the loop stop when converged? (magnetic engagement keeps it running) */
  mayIdle: () => boolean
  onConverged: () => void
}): IFollowerPipeline {
  const { state } = args

  return {
    frame(dt) {
      args.composeTarget(dt)

      const k = lerpFactor(args.getTrailing(), dt)
      state.follower.x += (state.target.x - state.follower.x) * k
      state.follower.y += (state.target.y - state.follower.y) * k
      state.lag.x = state.target.x - state.follower.x
      state.lag.y = state.target.y - state.follower.y

      args.renderPosition(state.follower.x, state.follower.y)
      const elasticSettled = args.applyElastic()

      if (
        elasticSettled &&
        args.mayIdle() &&
        Math.abs(state.lag.x) < CONVERGE_EPS &&
        Math.abs(state.lag.y) < CONVERGE_EPS
      ) {
        state.follower.x = state.target.x
        state.follower.y = state.target.y
        state.lag.x = 0
        state.lag.y = 0
        args.renderPosition(state.follower.x, state.follower.y)
        args.onConverged()
      }
      // One commit for the whole frame — the convergence re-render folds in too.
      args.flush()
    },
    snap() {
      args.composeTarget(FRAME_60)
      state.follower.x = state.target.x
      state.follower.y = state.target.y
      state.lag.x = 0
      state.lag.y = 0
      args.renderPosition(state.follower.x, state.follower.y)
      args.flush()
    }
  }
}
