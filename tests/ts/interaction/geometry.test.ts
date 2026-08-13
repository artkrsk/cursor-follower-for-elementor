import { writeEntry } from '@ts/interaction/geometry'
import type { IGeometryEntry } from '@ts/interfaces'
import { describe, expect, it } from 'vitest'

/**
 * The pure coordinate write. The factory around it needs IntersectionObserver
 * and ResizeObserver, so it belongs to the DOM tier — this is the piece that
 * holds the one bit of arithmetic.
 */

const rect = (over: Partial<DOMRectReadOnly> = {}) =>
  ({ left: 0, top: 0, width: 0, height: 0, ...over }) as DOMRectReadOnly

const anElement = () => ({ nodeType: 1 }) as unknown as Element

describe('writeEntry', () => {
  it('stores page coordinates as the rect plus the scroll it was read with', () => {
    const entries = new WeakMap<Element, IGeometryEntry>()

    const entry = writeEntry(
      entries,
      anElement(),
      rect({ left: 10, top: 20, width: 100, height: 50 }),
      5,
      7
    )

    expect(entry).toEqual({ pageX: 15, pageY: 27, w: 100, h: 50 })
  })

  /** Page space is scroll-invariant: the same element measured at two scroll
      positions has to land on the same page coordinate. */
  it('yields the same page coordinate after the page has scrolled', () => {
    const entries = new WeakMap<Element, IGeometryEntry>()
    const element = anElement()

    writeEntry(entries, element, rect({ left: 10, top: 200 }), 0, 0)
    const scrolled = writeEntry(entries, element, rect({ left: 10, top: 100 }), 0, 100)

    expect(scrolled.pageY).toBe(200)
  })

  /**
   * Entries are stable objects mutated in place — an engaged magnetic anchor
   * holds a reference and has to see the update, not a stale copy.
   */
  it('mutates an existing entry rather than replacing it', () => {
    const entries = new WeakMap<Element, IGeometryEntry>()
    const element = anElement()

    const first = writeEntry(
      entries,
      element,
      rect({ left: 0, top: 0, width: 10, height: 10 }),
      0,
      0
    )
    const second = writeEntry(
      entries,
      element,
      rect({ left: 40, top: 60, width: 20, height: 30 }),
      0,
      0
    )

    expect(second).toBe(first)
    expect(first).toEqual({ pageX: 40, pageY: 60, w: 20, h: 30 })
  })

  it('registers the entry against its element', () => {
    const entries = new WeakMap<Element, IGeometryEntry>()
    const element = anElement()

    const entry = writeEntry(entries, element, rect({ left: 1, top: 2 }), 0, 0)

    expect(entries.get(element)).toBe(entry)
  })

  it('keeps elements independent', () => {
    const entries = new WeakMap<Element, IGeometryEntry>()
    const a = anElement()
    const b = anElement()

    writeEntry(entries, a, rect({ left: 10 }), 0, 0)
    writeEntry(entries, b, rect({ left: 20 }), 0, 0)

    expect(entries.get(a)?.pageX).toBe(10)
    expect(entries.get(b)?.pageX).toBe(20)
  })
})
