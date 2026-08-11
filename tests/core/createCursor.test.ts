import { ruleEnabled } from '@ts/core/createCursor'
import { resolveOptions } from '@ts/core/options'
import type { IResolvedOptions, ITargetRule } from '@ts/interfaces'
import { describe, expect, it } from 'vitest'

/**
 * The gate that makes the Site Settings toggles behave like global switches: a
 * rule whose effect is off is treated as if it does not exist, so the element
 * falls back to its regular behaviour rather than going inert.
 *
 * Only the pure helper is exercised here — createCursor itself needs a DOM.
 */

const rule = (payload: ITargetRule['payload']): ITargetRule => ({ payload })

describe('ruleEnabled', () => {
  it('keeps every rule while nothing is switched off', () => {
    const options = resolveOptions()

    expect(ruleEnabled(rule({ magnetic: true }), options)).toBe(true)
    expect(ruleEnabled(rule({ highlight: true }), options)).toBe(true)
    expect(ruleEnabled(rule({ label: 'View' }), options)).toBe(true)
  })

  it('drops a magnetic rule while Magnetic is globally off', () => {
    const options = resolveOptions({ magnetic: false })

    expect(ruleEnabled(rule({ magnetic: true }), options)).toBe(false)
    expect(ruleEnabled(rule({ magnetic: 0.4 }), options)).toBe(false)
  })

  it('drops a highlight rule while Highlight is globally off', () => {
    const options = resolveOptions({ highlight: false })

    expect(ruleEnabled(rule({ highlight: true }), options)).toBe(false)
    expect(ruleEnabled(rule({ highlight: { scale: '80px' } }), options)).toBe(false)
  })

  /** A label rule has nothing to do with either toggle and must survive both. */
  it('leaves rules alone that neither toggle governs', () => {
    const options = resolveOptions({ magnetic: false, highlight: false })

    expect(ruleEnabled(rule({ label: 'View' }), options)).toBe(true)
    expect(ruleEnabled(rule({}), options)).toBe(true)
  })

  it('only gates on the effects the rule actually declares', () => {
    const options = resolveOptions({ magnetic: false })

    expect(ruleEnabled(rule({ highlight: true }), options)).toBe(true)
  })

  /** It reads the live options object, so a runtime toggle takes effect on the
      next pointer crossing without rebuilding the rule set. */
  it('tracks the options object being patched in place', () => {
    const options: IResolvedOptions = resolveOptions()
    const magneticRule = rule({ magnetic: true })

    expect(ruleEnabled(magneticRule, options)).toBe(true)

    options.magnetic = false
    expect(ruleEnabled(magneticRule, options)).toBe(false)
  })
})
