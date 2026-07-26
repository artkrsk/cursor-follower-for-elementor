import { CONTENT_OFFSET_VAR, CONTENT_OFFSET_Y } from '@ts/constants'
import {
  arrowOnlyPill,
  arrowRadiusCss,
  arrowReservation,
  borderWidthCss,
  floorScale,
  highlightEligible,
  iconKind,
  mergeLayers,
  offsetCss,
  pillGeometry,
  resolveAppearance
} from '@ts/effects/suite'
import type { ICursorPayload, IGeometryCache, IGeometryEntry } from '@ts/interfaces'
import { describe, expect, it, vi } from 'vitest'

/**
 * The pure deciders only — everything here takes its element and its geometry
 * as arguments, and nothing in the codebase uses `instanceof`, so object
 * literals standing in for elements are legitimate inputs.
 */

const el = (over: Partial<{ closest: unknown; matches: unknown }> = {}) =>
  ({
    nodeType: 1,
    closest: () => null,
    matches: () => false,
    ...over
  }) as unknown as Element

/** Geometry that answers a fixed size and counts how often it was asked. */
const makeGeometry = (size = 200) => {
  const entry: IGeometryEntry = { pageX: 0, pageY: 0, w: size, h: size / 2 }
  return { resolve: vi.fn(() => entry) } as unknown as IGeometryCache
}

const BASE = 50

describe('mergeLayers', () => {
  it('stacks sessions over the hover payload, last wins per key', () => {
    expect(
      mergeLayers({ label: 'hover', scale: 'cursor' }, [{ label: 'a' }, { label: 'b' }])
    ).toEqual({ label: 'b', scale: 'cursor' })
  })

  it('keeps hover keys no session overrides', () => {
    expect(mergeLayers({ label: 'hover' }, [{ scale: '40px' }])).toEqual({
      label: 'hover',
      scale: '40px'
    })
  })

  it('a key stated as undefined does not clobber the layer below', () => {
    // Models an untyped JS consumer — exactOptionalPropertyTypes bans authoring
    // this shape in-repo, but nothing stops a plain-JS caller.
    const sloppy = { label: undefined, scale: '40px' } as unknown as ICursorPayload

    expect(mergeLayers({ label: 'hover' }, [sloppy])).toEqual({
      label: 'hover',
      scale: '40px'
    })
  })

  it('works with no hover layer at all', () => {
    expect(mergeLayers(undefined, [{ label: 'only' }])).toEqual({ label: 'only' })
    expect(mergeLayers(undefined, [])).toEqual({})
  })

  it('does not mutate the layers it merges', () => {
    const hover: ICursorPayload = { label: 'hover' }
    const session: ICursorPayload = { label: 'session' }

    mergeLayers(hover, [session])

    expect(hover).toEqual({ label: 'hover' })
    expect(session).toEqual({ label: 'session' })
  })
})

describe('highlightEligible', () => {
  /** An authored payload means the author is in charge. */
  it('is opt-in once a payload is present', () => {
    expect(highlightEligible({ label: 'x' }, el())).toBe(false)
    expect(highlightEligible({ label: 'x', highlight: true }, el())).toBe(true)
    expect(highlightEligible({ highlight: {} }, el())).toBe(true)
  })

  it('honours an explicit opt-out in the payload', () => {
    expect(highlightEligible({ highlight: false }, el())).toBe(false)
  })

  it('auto-highlights a bare interactive element carrying no payload', () => {
    expect(highlightEligible({}, el())).toBe(true)
  })

  it('has nothing to highlight without an element', () => {
    expect(highlightEligible({}, null)).toBe(false)
    expect(highlightEligible({ highlight: true }, null)).toBe(true)
  })

  it('lets an opt-out ancestor veto even an explicit payload', () => {
    const optedOut = el({
      closest: (s: string) => (s.includes('no-cursor-highlight') ? el() : null)
    })
    expect(highlightEligible({ highlight: true }, optedOut)).toBe(false)
  })

  it('never highlights a disabled control', () => {
    const disabled = el({ matches: () => true })
    expect(highlightEligible({ highlight: true }, disabled)).toBe(false)
  })
})

describe('iconKind', () => {
  it('a masked URL wins over glyph and markup — the only recolourable form', () => {
    expect(iconKind({ iconUrl: 'u.svg', iconClass: 'fa fa-x', icon: '<svg></svg>' })).toBe('mask')
  })

  it('a glyph class wins over raw markup', () => {
    expect(iconKind({ iconClass: 'fa fa-x', icon: '<svg></svg>' })).toBe('glyph')
  })

  it('raw markup is the last resort', () => {
    expect(iconKind({ icon: '<svg></svg>' })).toBe('markup')
  })

  it('a payload asking for no icon resolves to null', () => {
    expect(iconKind({})).toBeNull()
  })
})

describe('resolveAppearance', () => {
  it('resolves the payload scale when highlighting is off globally', () => {
    expect(resolveAppearance({ scale: '40px' }, el(), makeGeometry(), BASE, false)).toEqual({
      scale: 40 / BASE,
      highlight: false
    })
  })

  it('applies the configured highlight scale to a bare interactive', () => {
    expect(resolveAppearance({}, el(), makeGeometry(), BASE, { scale: '80px' })).toEqual({
      scale: 80 / BASE,
      highlight: true
    })
  })

  it('lets the payload override the configured highlight', () => {
    expect(
      resolveAppearance({ highlight: { scale: '100px' } }, el(), makeGeometry(), BASE, {
        scale: '80px'
      })
    ).toEqual({ scale: 100 / BASE, highlight: true })
  })

  /** Falling back matters: an unresolvable highlight scale must not wipe out a
      scale the payload did resolve. */
  it('keeps the payload scale when the highlight scale cannot resolve', () => {
    const result = resolveAppearance(
      { scale: '40px', highlight: { scale: 'target' } },
      null,
      makeGeometry(),
      BASE,
      { scale: '80px' }
    )
    expect(result.scale).toBe(40 / BASE)
    expect(result.highlight).toBe(true)
  })

  /**
   * The layout-read guard. Hovering a plain link must not measure it — the
   * geometry cache is only consulted when the size grammar names 'target'.
   */
  it('does not measure the element unless the grammar asks for it', () => {
    const geometry = makeGeometry()

    resolveAppearance({ scale: '40px' }, el(), geometry, BASE, false)
    resolveAppearance({}, el(), geometry, BASE, { scale: '80px' })

    expect(geometry.resolve).not.toHaveBeenCalled()
  })

  it('measures the element when the payload scale references the target', () => {
    const geometry = makeGeometry(200)

    const result = resolveAppearance({ scale: 'target' }, el(), geometry, BASE, false)

    expect(geometry.resolve).toHaveBeenCalledOnce()
    expect(result.scale).toBe(200 / BASE) // larger dimension of a 200×100 box
  })

  it('measures the element when only the highlight scale references the target', () => {
    const geometry = makeGeometry(200)

    resolveAppearance({}, el(), geometry, BASE, { scale: 'target' })

    expect(geometry.resolve).toHaveBeenCalledOnce()
  })
})

describe('borderWidthCss', () => {
  it('takes an explicit width as authored', () => {
    expect(borderWidthCss(3)).toBe('3px')
    expect(borderWidthCss('0.5rem')).toBe('0.5rem')
  })

  /** Optical constancy lives in the stylesheet (box-shadow divides the width var
      by the scale var), so without an explicit payload width the engine must
      write NOTHING — an inline var here would beat every kit rule and kill the
      per-state Border Width controls. */
  it('writes nothing without an explicit width, leaving the var to kit CSS', () => {
    expect(borderWidthCss(undefined)).toBeNull()
  })
})

describe('arrowRadiusCss', () => {
  it('is half the ring diameter at the applied scale', () => {
    expect(arrowRadiusCss(60, 1)).toBe('30px')
    expect(arrowRadiusCss(60, 2)).toBe('60px')
  })

  it('treats an unresolved scale as 1', () => {
    expect(arrowRadiusCss(60, null)).toBe('30px')
  })
})

describe('floorScale', () => {
  /** No label shown — the appearance scale passes through untouched, null
      included, so the caller still writes nothing rather than writing 1. */
  it('leaves the scale alone when no label is shown', () => {
    expect(floorScale(0.4, 0)).toBe(0.4)
    expect(floorScale(null, 0)).toBeNull()
  })

  it('raises a scale too small to contain the label', () => {
    expect(floorScale(0.4, 1.8)).toBe(1.8)
  })

  it('keeps a scale that already contains the label', () => {
    expect(floorScale(3, 1.8)).toBe(3)
  })

  /** A payload with no scale of its own sits at the ring's natural size, so the
      floor competes with 1 rather than with nothing. */
  it('measures an unresolved scale against the natural ring size', () => {
    expect(floorScale(null, 1.8)).toBe(1.8)
    expect(floorScale(null, 0.5)).toBe(1)
  })
})

describe('pillGeometry', () => {
  it('hugs the label with padding on both axes', () => {
    // height = 14 + 2*8 = 30, width = 100 + 2*18 = 136.
    expect(pillGeometry(100, 14, 18, 8)).toEqual({ width: 136, height: 30 })
  })

  /** A width equal to the height IS the circle, so a label no wider than the
      pill is tall stays round. */
  it('floors to a circle when the padded label is no wider than it is tall', () => {
    expect(pillGeometry(0, 14, 0, 8)).toEqual({ width: 30, height: 30 })
  })
})

describe('arrowReservation', () => {
  const THEME = () => ({ gap: 8, size: 24 })

  it('reserves nothing when arrows are inactive', () => {
    expect(arrowReservation({}, THEME)).toEqual({ x: 0, y: 0, floorW: 0, floorH: 0 })
  })

  it('reserves nothing when arrows is explicitly false', () => {
    expect(arrowReservation({ arrows: false }, THEME)).toEqual({
      x: 0,
      y: 0,
      floorW: 0,
      floorH: 0
    })
  })

  it('reserves nothing when the pair seats outside the edge', () => {
    expect(arrowReservation({ arrows: 'all', arrowsPosition: 'outside' }, THEME)).toEqual({
      x: 0,
      y: 0,
      floorW: 0,
      floorH: 0
    })
  })

  /** The glyph's breadth floors the PERPENDICULAR axis, so a pill sized by
      arrows alone still wraps the chevron instead of touching it. */
  it('reserves only the horizontal axis for a horizontal pair, flooring the height', () => {
    expect(arrowReservation({ arrows: 'horizontal' }, THEME)).toEqual({
      x: 16,
      y: 0,
      floorW: 0,
      floorH: 16
    })
  })

  it('reserves only the vertical axis for a vertical pair, flooring the width', () => {
    expect(arrowReservation({ arrows: 'vertical' }, THEME)).toEqual({
      x: 0,
      y: 16,
      floorW: 16,
      floorH: 0
    })
  })

  it('reserves both axes for "all"', () => {
    expect(arrowReservation({ arrows: 'all' }, THEME)).toEqual({
      x: 16,
      y: 16,
      floorW: 16,
      floorH: 16
    })
  })

  /** Locks the formula (gap + tip-to-tail span), not a hardcoded number: the
      CSS inside-seat calc parks the tail at reach − gap − size/3, so growing
      reach by gap + size/3 lands it flush with the un-reserved content edge. */
  it('derives the reserved depth from the gap plus the glyph tip-to-tail span', () => {
    expect(arrowReservation({ arrows: 'horizontal' }, () => ({ gap: 0, size: 24 })).x).toBe(8)
    expect(arrowReservation({ arrows: 'horizontal' }, () => ({ gap: 20, size: 24 })).x).toBe(28)
  })

  /** Depth is size/3 and breadth size×2/3 (fixed by the SVG path), so the one
      CSS size knob retunes the whole reservation with it. */
  it('scales depth and breadth with the arrow size', () => {
    expect(arrowReservation({ arrows: 'horizontal' }, () => ({ gap: 0, size: 12 }))).toEqual({
      x: 4,
      y: 0,
      floorW: 0,
      floorH: 8
    })
  })

  /** The theme comes from a computed-style read the caller caches — sampling it
      only when a reservation happens keeps that read off payloads without
      arrows. */
  it('samples the theme only when a reservation actually happens', () => {
    const theme = vi.fn(() => ({ gap: 8, size: 24 }))

    arrowReservation({}, theme)
    arrowReservation({ arrows: 'all', arrowsPosition: 'outside' }, theme)

    expect(theme).not.toHaveBeenCalled()
  })
})

describe('arrowOnlyPill', () => {
  const THEME = () => ({ gap: 8, size: 24 })
  const PAD = () => ({ x: 18, y: 8 })

  /** Arrows alone establish the box: glyph-breadth content wrapped in the same
      padding vars, grown by the reservation on the pointing axis. */
  it('establishes a horizontal stadium from a horizontal pair alone', () => {
    // r = {x: 16, floorH: 16} → pillGeometry(0, 16, 18+16, 8) = 68×32.
    expect(arrowOnlyPill({ shape: 'pill', arrows: 'horizontal' }, PAD, THEME)).toEqual({
      width: 68,
      height: 32
    })
  })

  /** A label-less vertical pair has nothing competing for width, so the shape
      commits to the vertical axis — the horizontal stadium transposed. */
  it('transposes the stadium onto the vertical axis for a vertical pair', () => {
    expect(arrowOnlyPill({ shape: 'pill', arrows: 'vertical' }, PAD, THEME)).toEqual({
      width: 32,
      height: 68
    })
  })

  /** An arrows-only 'all' box would be a rounded square — neither pill nor
      circle — so it falls through to the base circle. */
  it('declines "all" — the rounded square falls through to the base circle', () => {
    expect(arrowOnlyPill({ shape: 'pill', arrows: 'all' }, PAD, THEME)).toBeNull()
  })

  it('declines a pill with nothing reserved', () => {
    expect(arrowOnlyPill({ shape: 'pill' }, PAD, THEME)).toBeNull()
    expect(
      arrowOnlyPill({ shape: 'pill', arrows: 'horizontal', arrowsPosition: 'outside' }, PAD, THEME)
    ).toBeNull()
  })

  /** Both thunks sit on computed-style reads — a payload that can't establish
      a box must not trigger them. */
  it('has no opinion off the pill shape and never samples the thunks', () => {
    const pad = vi.fn(() => ({ x: 18, y: 8 }))
    const theme = vi.fn(() => ({ gap: 8, size: 24 }))

    expect(arrowOnlyPill({ arrows: 'horizontal' }, pad, theme)).toBeNull()
    expect(arrowOnlyPill({ shape: 'circle', arrows: 'horizontal' }, pad, theme)).toBeNull()

    expect(pad).not.toHaveBeenCalled()
    expect(theme).not.toHaveBeenCalled()
  })
})

describe('offsetCss', () => {
  /** The nudge is emitted as a var reference, not a literal, so Site Settings
      owns the distance — the constant is only the fallback inside it. */
  const NUDGE = `var(${CONTENT_OFFSET_VAR}, ${CONTENT_OFFSET_Y}px)`

  it('nudges a label clear of the OS cursor', () => {
    expect(offsetCss({ label: 'View' })).toEqual(['0px', NUDGE])
  })

  it('nudges an icon clear of the OS cursor too — it also settles centered', () => {
    expect(offsetCss({ className: 'icon-star' })).toEqual(['0px', NUDGE])
  })

  it('lets an explicit payload offset win over the label nudge', () => {
    expect(offsetCss({ label: 'View', offset: [10, -5] })).toEqual(['10px', '-5px'])
  })

  it('honours an explicit offset with no label in play', () => {
    expect(offsetCss({ offset: [0, 12] })).toEqual(['0px', '12px'])
  })

  it('skips the auto nudge when the native cursor is hidden — nothing to clear', () => {
    expect(offsetCss({ label: 'View', hideNativeCursor: true })).toBeNull()
  })

  it('still applies an explicit offset when the native cursor is hidden', () => {
    expect(offsetCss({ label: 'View', hideNativeCursor: true, offset: [0, -5] })).toEqual([
      '0px',
      '-5px'
    ])
  })

  /** Null, not [0px, 0px] — the caller removes the properties so the CSS
      default stands rather than being pinned to zero. */
  it('has no opinion when nothing asks for a shift', () => {
    expect(offsetCss({})).toBeNull()
    expect(offsetCss({ scale: '40px' })).toBeNull()
  })
})
