import { round1, round3 } from '@ts/utils/round'
import { describe, expect, it } from 'vitest'

describe('write granularity', () => {
  it('quantizes positions to the 0.1px write step', () => {
    expect(round1(12.34)).toBe(12.3)
    expect(round1(12.36)).toBe(12.4)
    expect(round1(-3.14)).toBe(-3.1)
    expect(round1(2)).toBe(2)
  })

  it('quantizes matrix components to the 0.001 write step', () => {
    expect(round3(0.12345)).toBe(0.123)
    expect(round3(0.9996)).toBe(1)
    expect(round3(-0.0004)).toBe(-0)
  })
})
