import { resolveEasing } from '@ts/follower/easing'
import { describe, expect, it } from 'vitest'

describe('CSS timing evaluation', () => {
  it('preserves expansion overshoot and monotonic home return', () => {
    expect(resolveEasing('cubic-bezier(0.34, 1.56, 0.64, 1)')(0.5)).toBeGreaterThan(1)
    const ease = resolveEasing('ease-out')
    let previous = 0
    for (let i = 0; i <= 100; i++) {
      const next = ease(i / 100)
      expect(next).toBeGreaterThanOrEqual(previous)
      expect(next).toBeLessThanOrEqual(1)
      previous = next
    }
  })
  it('uses linear timing for invalid curves and supports the CSS keywords', () => {
    for (const value of [
      'linear',
      'broken',
      'cubic-bezier(2, 0, 1, 1)',
      'cubic-bezier(0, nope, 1, 1)'
    ]) {
      expect(resolveEasing(value)(0.4)).toBe(0.4)
    }
    expect(resolveEasing('ease-in')(0.5)).toBeLessThan(0.5)
    expect(resolveEasing('ease-in-out')(0.5)).toBeCloseTo(0.5)
    expect(resolveEasing('ease')(0.5)).toBeGreaterThan(0.5)
  })
})
