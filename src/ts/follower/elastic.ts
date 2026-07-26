import { SETTLE_EPS, VELOCITY_FACTOR } from '../constants'
import type { IElasticModel, IFrameState, IResolvedOptions, ITransformWriter } from '../interfaces'

/**
 * Elastic squash from follower lag.
 * Pure shadow model — the lag comes from the pipeline state, never from a
 * DOM readback. Emits a unit direction vector, not an angle — the writer's
 * matrix is quadratic in it, so ±sign flips are invisible by construction.
 * Direction is only derived once squash ≥ SETTLE_EPS, which requires a
 * non-zero distance — the division below can never see zero.
 *
 * `options` is the engine's live object (mutated in place by updateOptions),
 * so the frame path reads a property instead of calling a getter closure.
 */

export function createElastic(args: {
  state: IFrameState
  writer: ITransformWriter
  options: Pick<IResolvedOptions, 'elastic'>
}): IElasticModel {
  const { state, writer, options } = args
  let applied = false

  const settle = () => {
    if (applied) {
      writer.resetElastic()
      applied = false
    }
    return true
  }

  return {
    frame() {
      const config = options.elastic
      if (!config) {
        return settle()
      }
      const { x, y } = state.lag
      const distance = Math.sqrt(x * x + y * y)
      const squash = Math.min(distance * VELOCITY_FACTOR, config.max) * config.strength
      if (squash < SETTLE_EPS) {
        return settle()
      }
      applied = true
      writer.setElastic(1 + squash, 1 - squash, x / distance, y / distance)
      return false
    }
  }
}
