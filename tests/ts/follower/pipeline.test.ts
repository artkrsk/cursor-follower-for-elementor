import { CONVERGE_EPS, FRAME_60 } from '@ts/constants'
import { createFollowerPipeline } from '@ts/follower/pipeline'
import type { IFrameState } from '@ts/interfaces'
import { lerpFactor } from '@ts/utils'
import { describe, expect, it, vi } from 'vitest'
import { makeFrameState } from '../support'

/**
 * The pipeline takes every collaborator as an argument, so the whole frame path
 * steps deterministically with plain fakes — no DOM, no ticker, no rAF.
 */

const setup = (
  state: IFrameState,
  over: Partial<Parameters<typeof createFollowerPipeline>[0]> = {}
) => {
  const args = {
    state,
    getTrailing: () => 0.2,
    composeTarget: vi.fn(),
    renderPosition: vi.fn(),
    applyElastic: vi.fn(() => true),
    flush: vi.fn(),
    mayIdle: vi.fn(() => true),
    onConverged: vi.fn(),
    ...over
  }
  return { pipeline: createFollowerPipeline(args), args }
}

describe('frame', () => {
  it('composes the target before reading it', () => {
    const state = makeFrameState()
    const { pipeline, args } = setup(state, {
      composeTarget: vi.fn(() => {
        state.target.x = 100
      })
    })

    pipeline.frame(FRAME_60)

    expect(args.composeTarget).toHaveBeenCalledExactlyOnceWith(FRAME_60)
    expect(state.follower.x).toBeGreaterThan(0)
  })

  it('covers exactly the lerp fraction of the remaining distance', () => {
    const state = makeFrameState({ target: { x: 100, y: 50 } })
    const { pipeline } = setup(state)

    pipeline.frame(FRAME_60)

    const k = lerpFactor(0.2, FRAME_60)
    expect(state.follower.x).toBeCloseTo(100 * k, 10)
    expect(state.follower.y).toBeCloseTo(50 * k, 10)
  })

  it('records lag as the distance still left AFTER the step', () => {
    const state = makeFrameState({ target: { x: 100, y: 0 } })
    const { pipeline } = setup(state)

    pipeline.frame(FRAME_60)

    expect(state.lag.x).toBeCloseTo(100 - state.follower.x, 10)
    expect(state.lag.y).toBe(0)
  })

  it('paints the follower position it just integrated', () => {
    const state = makeFrameState({ target: { x: 100, y: 50 } })
    const { pipeline, args } = setup(state)

    pipeline.frame(FRAME_60)

    expect(args.renderPosition).toHaveBeenCalledWith(state.follower.x, state.follower.y)
  })

  it('honours a trailing override read per frame', () => {
    const state = makeFrameState({ target: { x: 100, y: 0 } })
    let trailing = 1
    const { pipeline } = setup(state, { getTrailing: () => trailing })

    pipeline.frame(FRAME_60)
    expect(state.follower.x).toBeCloseTo(100, 10) // rate 1 → snap

    state.target.x = 200
    trailing = 0.2
    pipeline.frame(FRAME_60)
    expect(state.follower.x).toBeLessThan(200)
  })

  /** One commit per frame — the transform writer's dedupe rides on flush being
      called exactly once per frame. */
  it('commits the frame exactly once', () => {
    const state = makeFrameState({ target: { x: 100, y: 50 } })
    const { pipeline, args } = setup(state)

    pipeline.frame(FRAME_60)

    expect(args.flush).toHaveBeenCalledOnce()
  })
})

describe('convergence', () => {
  /** Within CONVERGE_EPS the lerp would asymptote forever; the pipeline lands it. */
  const nearlyThere = () =>
    makeFrameState({ target: { x: 100, y: 100 }, follower: { x: 100 - CONVERGE_EPS / 2, y: 100 } })

  it('snaps exactly onto the target and zeroes the lag', () => {
    const state = nearlyThere()
    const { pipeline } = setup(state)

    pipeline.frame(FRAME_60)

    expect(state.follower).toEqual({ x: 100, y: 100 })
    expect(state.lag).toEqual({ x: 0, y: 0 })
  })

  it('repaints at the snapped position and reports convergence', () => {
    const state = nearlyThere()
    const { pipeline, args } = setup(state)

    pipeline.frame(FRAME_60)

    expect(args.onConverged).toHaveBeenCalledOnce()
    expect(args.renderPosition).toHaveBeenLastCalledWith(100, 100)
  })

  /** The converging frame renders twice (normal step, then the snapped repaint),
      but still commits ONCE — the second render folds into the same flush. */
  it('still commits exactly once on the converging frame', () => {
    const state = nearlyThere()
    const { pipeline, args } = setup(state)

    pipeline.frame(FRAME_60)

    expect(args.renderPosition).toHaveBeenCalledTimes(2)
    expect(args.flush).toHaveBeenCalledOnce()
  })

  it('stays awake while the elastic squash is still visible', () => {
    const state = nearlyThere()
    const { pipeline, args } = setup(state, { applyElastic: vi.fn(() => false) })

    pipeline.frame(FRAME_60)

    expect(args.onConverged).not.toHaveBeenCalled()
    expect(state.follower.x).not.toBe(100)
  })

  /** Magnetic engagement holds the loop open — the trap needs a live frame. */
  it('stays awake while something forbids idling', () => {
    const state = nearlyThere()
    const { pipeline, args } = setup(state, { mayIdle: vi.fn(() => false) })

    pipeline.frame(FRAME_60)

    expect(args.onConverged).not.toHaveBeenCalled()
  })

  it('does not converge while still far from the target', () => {
    const state = makeFrameState({ target: { x: 1000, y: 0 } })
    const { pipeline, args } = setup(state)

    pipeline.frame(FRAME_60)

    expect(args.onConverged).not.toHaveBeenCalled()
  })
})

describe('snap', () => {
  it('composes at a nominal 60fps frame, since there is no real delta yet', () => {
    const state = makeFrameState()
    const { pipeline, args } = setup(state)

    pipeline.snap()

    expect(args.composeTarget).toHaveBeenCalledExactlyOnceWith(FRAME_60)
  })

  it('places the follower on the target with no lag and paints once', () => {
    const state = makeFrameState({ target: { x: 42, y: 7 }, lag: { x: 9, y: 9 } })
    const { pipeline, args } = setup(state)

    pipeline.snap()

    expect(state.follower).toEqual({ x: 42, y: 7 })
    expect(state.lag).toEqual({ x: 0, y: 0 })
    expect(args.renderPosition).toHaveBeenCalledExactlyOnceWith(42, 7)
  })

  it('never reports convergence — snapping is not idling', () => {
    const { pipeline, args } = setup(makeFrameState())

    pipeline.snap()

    expect(args.onConverged).not.toHaveBeenCalled()
  })

  it('commits the snapped position once', () => {
    const { pipeline, args } = setup(makeFrameState())

    pipeline.snap()

    expect(args.flush).toHaveBeenCalledOnce()
  })
})
