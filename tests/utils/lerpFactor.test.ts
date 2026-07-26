import { FRAME_60 } from '@ts/constants'
import { lerpFactor } from '@ts/utils/lerpFactor'
import { describe, expect, it } from 'vitest'

describe('lerpFactor', () => {
  it('is the rate itself at exactly 60fps', () => {
    expect(lerpFactor(0.2, FRAME_60)).toBeCloseTo(0.2, 10)
  })

  it('saturates at 1 so a rate of 1 or more snaps instantly', () => {
    expect(lerpFactor(1, FRAME_60)).toBe(1)
    expect(lerpFactor(2, FRAME_60 / 4)).toBe(1)
  })

  it('covers more ground in a longer frame', () => {
    expect(lerpFactor(0.2, FRAME_60 * 2)).toBeGreaterThan(lerpFactor(0.2, FRAME_60))
    expect(lerpFactor(0.2, FRAME_60 / 2)).toBeLessThan(lerpFactor(0.2, FRAME_60))
  })

  /**
   * The reason this function exists: the follower has to land in the same place
   * after a given wall-clock duration regardless of how that duration was
   * chopped into frames, or the feel changes with the refresh rate.
   */
  it('is frame-rate independent — two half-steps equal one whole step', () => {
    const rate = 0.2
    const whole = 1 - lerpFactor(rate, FRAME_60)

    const half = 1 - lerpFactor(rate, FRAME_60 / 2)
    expect(half * half).toBeCloseTo(whole, 10)

    const quarter = 1 - lerpFactor(rate, FRAME_60 / 4)
    expect(quarter ** 4).toBeCloseTo(whole, 10)
  })

  it('integrates to the same remaining distance at 30fps and 144fps', () => {
    const rate = 0.15
    const remainingAfter = (dt: number, steps: number) => (1 - lerpFactor(rate, dt)) ** steps

    // One second of animation, chopped two different ways.
    expect(remainingAfter(1000 / 30, 30)).toBeCloseTo(remainingAfter(1000 / 144, 144), 10)
  })
})
