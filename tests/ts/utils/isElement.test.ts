import { XHTML_NS } from '@ts/constants'
import { isElement, isHTMLElement, isStyledElement } from '@ts/utils/isElement'
import { describe, expect, it } from 'vitest'

/**
 * These guards exist because `instanceof` is unusable across realms — Elementor's
 * preview iframe has its own constructor set. Every case below is a plain object,
 * which is the point: nothing here is constructed by a DOM, and the guards still
 * have to answer correctly. That is also what lets the rest of this suite hand
 * object literals to the engine.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

describe('isElement', () => {
  it('accepts anything reporting nodeType 1, whatever built it', () => {
    expect(isElement({ nodeType: 1 })).toBe(true)
    expect(isElement({ nodeType: 1, namespaceURI: SVG_NS })).toBe(true)
  })

  it('rejects other node types', () => {
    expect(isElement({ nodeType: 3 })).toBe(false) // text
    expect(isElement({ nodeType: 9 })).toBe(false) // document
  })

  it('rejects non-objects without throwing on them', () => {
    expect(isElement(null)).toBe(false)
    expect(isElement(undefined)).toBe(false)
    expect(isElement('div')).toBe(false)
    expect(isElement(1)).toBe(false)
  })
})

describe('isHTMLElement', () => {
  it('separates HTML from SVG on the spec-fixed namespace', () => {
    expect(isHTMLElement({ nodeType: 1, namespaceURI: XHTML_NS })).toBe(true)
    expect(isHTMLElement({ nodeType: 1, namespaceURI: SVG_NS })).toBe(false)
  })

  it('rejects an element with no namespace at all', () => {
    expect(isHTMLElement({ nodeType: 1 })).toBe(false)
  })
})

describe('isStyledElement', () => {
  /**
   * Deliberately wider than isHTMLElement: the magnetic path only ever touches
   * `style` and getComputedStyle, and an inline <svg> anchor has to keep working.
   */
  it('accepts any element carrying a style object, SVG included', () => {
    expect(isStyledElement({ nodeType: 1, namespaceURI: XHTML_NS, style: {} })).toBe(true)
    expect(isStyledElement({ nodeType: 1, namespaceURI: SVG_NS, style: {} })).toBe(true)
  })

  it('rejects an element without one', () => {
    expect(isStyledElement({ nodeType: 1, namespaceURI: XHTML_NS })).toBe(false)
  })

  it('rejects a plain object that merely has a style key', () => {
    expect(isStyledElement({ style: {} })).toBe(false)
  })
})
