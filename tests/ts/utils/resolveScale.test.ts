import { resolveScale, usesTargetRef } from '@ts/utils/resolveScale'
import { describe, expect, it } from 'vitest'

/**
 * resolveScale returns a RATIO of the base cursor size, never a pixel value —
 * every expectation below divides by the base it was given.
 */

const BASE = 50

describe('resolveScale', () => {
  it('resolves a px size against the base', () => {
    expect(resolveScale('40px', BASE)).toBe(40 / BASE)
  })

  it('reads a percentage as a multiplier of the base, not of the target', () => {
    expect(resolveScale('120%', BASE)).toBeCloseTo(1.2)
    expect(resolveScale('50%', BASE)).toBeCloseTo(0.5)
  })

  it("resolves 'cursor' to the base itself", () => {
    expect(resolveScale('cursor', BASE)).toBe(1)
  })

  it("resolves 'target' from the measured element", () => {
    expect(resolveScale('target', BASE, 100)).toBe(2)
  })

  it("returns null for 'target' when nothing measured it", () => {
    expect(resolveScale('target', BASE)).toBeNull()
    expect(resolveScale('target', BASE, 0)).toBeNull()
  })

  it('returns null rather than throwing on an unresolvable value', () => {
    expect(resolveScale('wat', BASE)).toBeNull()
    expect(resolveScale('40em', BASE)).toBeNull()
  })

  it('returns null for a px or % value whose number will not parse', () => {
    expect(resolveScale('px', BASE)).toBeNull()
    expect(resolveScale('abc%', BASE)).toBeNull()
  })

  it('treats absent, null and false as no opinion', () => {
    expect(resolveScale(undefined, BASE)).toBeNull()
    expect(resolveScale(null, BASE)).toBeNull()
    expect(resolveScale(false, BASE)).toBeNull()
  })

  it('returns null when there is no base to be a ratio of', () => {
    expect(resolveScale('40px', 0)).toBeNull()
    expect(resolveScale('40px', -10)).toBeNull()
  })

  describe('object form', () => {
    it('applies the factor to the referenced size', () => {
      expect(resolveScale({ ref: 'cursor', factor: 0.8 }, BASE)).toBeCloseTo(0.8)
      expect(resolveScale({ ref: 'target', factor: 0.5 }, BASE, 200)).toBeCloseTo(2)
    })

    it('defaults the factor to 1', () => {
      expect(resolveScale({ ref: 'cursor' }, BASE)).toBe(1)
    })

    it('clamps with bounds that share the size grammar', () => {
      // 200px target, clamped to at most 100px → ratio 2 rather than 4.
      expect(resolveScale({ ref: 'target', max: '100px' }, BASE, 200)).toBe(2)
      // 20px target, floored at 60px → ratio 1.2 rather than 0.4.
      expect(resolveScale({ ref: 'target', min: '60px' }, BASE, 20)).toBeCloseTo(1.2)
      expect(resolveScale({ ref: 'cursor', max: '150%' }, BASE)).toBe(1)
    })

    it('ignores a mis-authored non-string bound instead of throwing', () => {
      // @ts-expect-error — the guard exists for payloads authored as JSON.
      expect(resolveScale({ ref: 'target', max: 100 }, BASE, 200)).toBe(4)
    })

    it('ignores a bound that cannot itself resolve', () => {
      expect(resolveScale({ ref: 'cursor', min: 'target' }, BASE)).toBe(1)
    })
  })
})

/**
 * The predicate that decides whether the hovered element gets measured at all —
 * a plain link must not force a layout read, so anything not naming 'target'
 * has to answer false.
 */
describe('usesTargetRef', () => {
  it('is true for the bare target keyword', () => {
    expect(usesTargetRef('target')).toBe(true)
  })

  it('is true when any part of the object form names target', () => {
    expect(usesTargetRef({ ref: 'target' })).toBe(true)
    expect(usesTargetRef({ ref: 'cursor', min: 'target' })).toBe(true)
    expect(usesTargetRef({ ref: 'cursor', max: 'target' })).toBe(true)
  })

  it('is false for everything that would not need a measurement', () => {
    expect(usesTargetRef('cursor')).toBe(false)
    expect(usesTargetRef('40px')).toBe(false)
    expect(usesTargetRef({ ref: 'cursor', min: '20px', max: '80px' })).toBe(false)
    expect(usesTargetRef(undefined)).toBe(false)
    expect(usesTargetRef(null)).toBe(false)
    expect(usesTargetRef(false)).toBe(false)
  })
})
