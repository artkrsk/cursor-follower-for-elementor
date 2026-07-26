import {
  DEFAULT_ANIMATION_DURATION,
  DEFAULT_ATTRIBUTE,
  DEFAULT_CLICK_FACTOR,
  DEFAULT_ELASTIC_MAX,
  DEFAULT_ELASTIC_STRENGTH,
  DEFAULT_HIGHLIGHT_SIZE_PX,
  DEFAULT_MAGNETIC_RELEASE_RADIUS,
  DEFAULT_MAGNETIC_STRENGTH,
  DEFAULT_TRAILING
} from '@ts/constants'
import { applyOptionPatch, resolveOptions } from '@ts/core/options'
import { describe, expect, it } from 'vitest'

describe('resolveOptions', () => {
  it('fills every section from the shared defaults', () => {
    expect(resolveOptions()).toEqual({
      trailing: DEFAULT_TRAILING,
      elastic: { strength: DEFAULT_ELASTIC_STRENGTH, max: DEFAULT_ELASTIC_MAX },
      magnetic: {
        strength: DEFAULT_MAGNETIC_STRENGTH,
        releaseRadius: DEFAULT_MAGNETIC_RELEASE_RADIUS
      },
      highlight: { scale: `${DEFAULT_HIGHLIGHT_SIZE_PX}px` },
      clickScale: { scale: { ref: 'cursor', factor: DEFAULT_CLICK_FACTOR } },
      attribute: DEFAULT_ATTRIBUTE,
      targetScopes: [],
      animation: { duration: DEFAULT_ANIMATION_DURATION, easing: null }
    })
  })

  it('takes false as "off" for every section that can be disabled', () => {
    const options = resolveOptions({
      elastic: false,
      magnetic: false,
      highlight: false,
      clickScale: false
    })
    expect(options.elastic).toBe(false)
    expect(options.magnetic).toBe(false)
    expect(options.highlight).toBe(false)
    expect(options.clickScale).toBe(false)
  })

  it('fills only the gaps a partial section leaves', () => {
    expect(resolveOptions({ elastic: { strength: 3 } }).elastic).toEqual({
      strength: 3,
      max: DEFAULT_ELASTIC_MAX
    })
    expect(resolveOptions({ magnetic: { releaseRadius: 40 } }).magnetic).toEqual({
      strength: DEFAULT_MAGNETIC_STRENGTH,
      releaseRadius: 40
    })
  })

  it('does not carry the injectables into the resolved config', () => {
    const options = resolveOptions({ root: '#somewhere', ticker: { subscribe: () => () => {} } })
    expect(options).not.toHaveProperty('root')
    expect(options).not.toHaveProperty('ticker')
  })
})

describe('applyOptionPatch', () => {
  /**
   * The frame path closes over this exact object and reads a property per frame.
   * If a patch replaced it, the live feel controls would silently stop working
   * while every test on the returned value still passed.
   */
  it('mutates in place — the object identity has to survive a patch', () => {
    const options = resolveOptions()
    const before = options

    applyOptionPatch(options, { trailing: 0.5 })

    expect(options).toBe(before)
    expect(options.trailing).toBe(0.5)
  })

  it('leaves untouched anything the patch does not mention', () => {
    const options = resolveOptions({ trailing: 0.4 })
    applyOptionPatch(options, { magnetic: { strength: 0.9 } })

    expect(options.trailing).toBe(0.4)
    expect(options.elastic).toEqual({
      strength: DEFAULT_ELASTIC_STRENGTH,
      max: DEFAULT_ELASTIC_MAX
    })
  })

  it('re-normalizes a patched section rather than assigning it raw', () => {
    const options = resolveOptions()
    applyOptionPatch(options, { elastic: { strength: 2 } })

    expect(options.elastic).toEqual({ strength: 2, max: DEFAULT_ELASTIC_MAX })
  })

  it('re-normalizes a patched highlight section, filling the gaps it leaves', () => {
    const options = resolveOptions()
    applyOptionPatch(options, { highlight: {} })

    expect(options.highlight).toEqual({ scale: `${DEFAULT_HIGHLIGHT_SIZE_PX}px` })
  })

  it('takes a clickScale switch-off through the patch', () => {
    const options = resolveOptions()
    applyOptionPatch(options, { clickScale: false })

    expect(options.clickScale).toBe(false)
  })

  it('can turn a section off and back on', () => {
    const options = resolveOptions()

    applyOptionPatch(options, { magnetic: false })
    expect(options.magnetic).toBe(false)

    applyOptionPatch(options, { magnetic: { strength: 0.5 } })
    expect(options.magnetic).toEqual({
      strength: 0.5,
      releaseRadius: DEFAULT_MAGNETIC_RELEASE_RADIUS
    })
  })

  /** Structural options are wired once at init; patching them would lie. */
  it('ignores structural options', () => {
    const options = resolveOptions()
    applyOptionPatch(options, {
      attribute: 'data-other',
      targetScopes: [{ scope: '.x', rules: [] }]
    })

    expect(options.attribute).toBe(DEFAULT_ATTRIBUTE)
    expect(options.targetScopes).toEqual([])
  })
})
