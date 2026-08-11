import { SETTLE_EPS, VELOCITY_FACTOR } from '@ts/constants'
import { createElastic } from '@ts/follower/elastic'
import type { ITransformWriter } from '@ts/interfaces'
import { describe, expect, it, vi } from 'vitest'
import { makeFrameState } from '../support'

const makeWriter = (): ITransformWriter => ({
  setTranslate: vi.fn(),
  setElastic: vi.fn(),
  resetElastic: vi.fn(),
  flush: vi.fn()
})

/** Lag big enough to clear SETTLE_EPS comfortably. */
const BIG = { x: 300, y: 400 } // distance 500

describe('createElastic', () => {
  it('squashes along the lag direction, stretching one axis as it pinches the other', () => {
    const writer = makeWriter()
    const elastic = createElastic({
      state: makeFrameState({ lag: BIG }),
      writer,
      options: { elastic: { strength: 1, max: 1 } }
    })

    expect(elastic.frame()).toBe(false)

    const squash = 500 * VELOCITY_FACTOR
    expect(writer.setElastic).toHaveBeenCalledExactlyOnceWith(1 + squash, 1 - squash, 0.6, 0.8)
  })

  /** The writer's matrix needs a unit vector — it is quadratic in it. */
  it('passes a unit direction vector regardless of lag magnitude', () => {
    const writer = makeWriter()
    createElastic({
      state: makeFrameState({ lag: { x: -30, y: 40 } }),
      writer,
      options: { elastic: { strength: 10, max: 1 } }
    }).frame()

    const [, , cos, sin] = vi.mocked(writer.setElastic).mock.calls[0] ?? []
    expect(Math.hypot(cos as number, sin as number)).toBeCloseTo(1, 10)
    expect(cos).toBeCloseTo(-0.6)
    expect(sin).toBeCloseTo(0.8)
  })

  /** `max` caps the raw squash BEFORE strength multiplies it, so strength can
      still scale past the cap — reversing the order would silently change feel. */
  it('applies the max ceiling before the strength multiplier', () => {
    const writer = makeWriter()
    createElastic({
      state: makeFrameState({ lag: { x: 10_000, y: 0 } }),
      writer,
      options: { elastic: { strength: 2, max: 0.1 } }
    }).frame()

    // raw 10000 * 0.001 = 10, capped to 0.1, then × 2 = 0.2
    expect(writer.setElastic).toHaveBeenCalledExactlyOnceWith(1.2, 0.8, 1, 0)
  })

  it('scales the squash with strength', () => {
    const writer = makeWriter()
    createElastic({
      state: makeFrameState({ lag: { x: 100, y: 0 } }),
      writer,
      options: { elastic: { strength: 3, max: 1 } }
    }).frame()

    expect(writer.setElastic).toHaveBeenCalledExactlyOnceWith(1.3, 0.7, 1, 0)
  })
})

describe('settling', () => {
  it('reports settled and writes nothing while the lag is negligible', () => {
    const writer = makeWriter()
    const elastic = createElastic({
      state: makeFrameState({ lag: { x: SETTLE_EPS, y: 0 } }),
      writer,
      options: { elastic: { strength: 1, max: 1 } }
    })

    expect(elastic.frame()).toBe(true)
    expect(writer.setElastic).not.toHaveBeenCalled()
    expect(writer.resetElastic).not.toHaveBeenCalled()
  })

  /** Resetting every idle frame would write the transform forever; the model
      only resets on the transition back to rest. */
  it('resets exactly once when it comes to rest, not on every idle frame', () => {
    const state = makeFrameState({ lag: BIG })
    const writer = makeWriter()
    const elastic = createElastic({ state, writer, options: { elastic: { strength: 1, max: 1 } } })

    elastic.frame()
    expect(writer.resetElastic).not.toHaveBeenCalled()

    state.lag.x = 0
    state.lag.y = 0
    expect(elastic.frame()).toBe(true)
    expect(writer.resetElastic).toHaveBeenCalledOnce()

    elastic.frame()
    elastic.frame()
    expect(writer.resetElastic).toHaveBeenCalledOnce()
  })

  it('settles immediately when elastic is switched off', () => {
    const writer = makeWriter()
    const elastic = createElastic({
      state: makeFrameState({ lag: BIG }),
      writer,
      options: { elastic: false }
    })

    expect(elastic.frame()).toBe(true)
    expect(writer.setElastic).not.toHaveBeenCalled()
  })

  it('unwinds an applied squash when elastic is switched off mid-motion', () => {
    const state = makeFrameState({ lag: BIG })
    const writer = makeWriter()
    const options: { elastic: { strength: number; max: number } | false } = {
      elastic: { strength: 1, max: 1 }
    }
    const elastic = createElastic({ state, writer, options })

    elastic.frame()
    options.elastic = false

    expect(elastic.frame()).toBe(true)
    expect(writer.resetElastic).toHaveBeenCalledOnce()
  })
})
