import { hintFitScale } from '@ts/utils/hintFitScale'
import { describe, expect, it } from 'vitest'

describe('hintFitScale', () => {
  /**
   * The ring is a circle, so it is the label's DIAGONAL that has to fit inside
   * it — using the width alone would clip the corners of a tall label.
   */
  it('fits the diagonal of the label box, not its width', () => {
    // 30×40 box → diagonal 50, no margin, base 50 → exactly 1.
    expect(hintFitScale(30, 40, 50, 0)).toBeCloseTo(1)
    // A square label needs more than its own width.
    expect(hintFitScale(50, 50, 50, 0)).toBeGreaterThan(1)
  })

  it('adds the margin on both sides', () => {
    // diagonal 50 + 2×10 = 70, over base 50.
    expect(hintFitScale(30, 40, 50, 10)).toBeCloseTo(70 / 50)
  })

  it('is a ratio of the base size', () => {
    expect(hintFitScale(30, 40, 100, 0)).toBeCloseTo(0.5)
    expect(hintFitScale(30, 40, 25, 0)).toBeCloseTo(2)
  })

  it('returns 0 when there is no base to be a ratio of', () => {
    expect(hintFitScale(30, 40, 0, 10)).toBe(0)
    expect(hintFitScale(30, 40, -1, 10)).toBe(0)
  })

  it('handles an unmeasured label as margin-only', () => {
    expect(hintFitScale(0, 0, 50, 10)).toBeCloseTo(20 / 50)
  })
})
