// @vitest-environment happy-dom

import {
  ARROW_BREADTH_RATIO,
  ARROW_DEPTH_RATIO,
  ARROW_GAP_FALLBACK,
  ARROW_GAP_VAR,
  ARROW_RADIUS_VAR,
  ARROW_SIZE_FALLBACK,
  ARROW_SIZE_VAR,
  ARROWS_ATTR,
  ARROWS_POSITION_ATTR,
  BASE_SIZE_FALLBACK,
  BG_VAR,
  BORDER_WIDTH_VAR,
  CLEAR_DELAY_PAD_MS,
  DEFAULT_ANIMATION_DURATION,
  DOT_ATTR,
  HIGHLIGHT_ATTR,
  HINT_ATTR,
  HINT_FIT_MARGIN,
  HINT_ICON_ATTR,
  HTML_NO_NATIVE,
  HTML_PROGRESS,
  LOADING_ATTR,
  OFFSET_X_VAR,
  OFFSET_Y_VAR,
  PILL_PAD_X_VAR,
  PILL_PAD_Y_VAR,
  PRESS_VAR,
  PRESSED_ATTR,
  SCALE_PRESSED_VAR,
  SCALE_VAR,
  SHAPE_ATTR,
  SHAPE_AXIS_ATTR,
  SHAPE_HEIGHT_VAR,
  SHAPE_WIDTH_VAR,
  TEXT_COLOR_VAR
} from '@ts/constants'
import { resolveOptions } from '@ts/core/options'
import { applyHint, createEffectsSuite } from '@ts/effects/suite'
import type { ICursorRefs, IGeometryCache, IGeometryEntry, IResolvedOptions } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The applier tier: recompute() writing the CSS state machine's attributes and
 * custom properties. The deciders it calls are covered in suite.test.ts against
 * no DOM at all — what is asserted here is only that each decision reaches the
 * right element.
 *
 * offsetWidth/offsetHeight are 0 in every non-browser DOM, so the base size
 * falls back to BASE_SIZE_FALLBACK and a shown label measures as a zero box
 * unless a test defines those properties. Both are defined explicitly wherever
 * the expectation depends on them, rather than left to the fallback by accident.
 */

const sized = (el: HTMLElement, width: number, height: number) => {
  Object.defineProperty(el, 'offsetWidth', { value: width, configurable: true })
  Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true })
  return el
}

const geometry = (size = 200): IGeometryCache => {
  const entry: IGeometryEntry = { pageX: 0, pageY: 0, w: size, h: size / 2 }
  return { resolve: () => entry } as unknown as IGeometryCache
}

let refs: ICursorRefs
let html: HTMLElement

const build = (options: IResolvedOptions = resolveOptions()) => {
  html = document.createElement('html')
  const root = document.createElement('div')
  const follower = document.createElement('div')
  const hint = document.createElement('div')
  const hintText = document.createElement('div')
  const hintIcon = document.createElement('div')
  hint.append(hintText, hintIcon)
  root.append(follower, hint)
  refs = { root, follower, hint, hintText, hintIcon, built: true }
  return createEffectsSuite({ refs, options, geometry: geometry(), html })
}

const cssVar = (el: HTMLElement, name: string) => el.style.getPropertyValue(name)

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('recompute — scale', () => {
  it('writes nothing for a payload with no opinion on either', () => {
    const suite = build()

    suite.setHover({ textColor: 'red' }, null)

    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('')
  })

  it('writes the resolved scale as a bare ratio of the base size', () => {
    const suite = build()

    suite.setHover({ scale: `${BASE_SIZE_FALLBACK * 2}px` }, null)

    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('2')
  })

  /** The floor is what makes the ring contain its own label. */
  it('lets a label floor a scale too small to contain it', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 120, 0)

    suite.setHover({ label: 'View', scale: '10px' }, null)

    // hypot(120, 0) + 2 * HINT_FIT_MARGIN, over the 60px base.
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe(String(128 / BASE_SIZE_FALLBACK))
  })

  it('leaves a scale that already contains the label alone', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 10, 0)

    suite.setHover({ label: 'View', scale: `${BASE_SIZE_FALLBACK * 3}px` }, null)

    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('3')
  })

  it('seats the arrows on the ring edge at the applied scale', () => {
    const suite = build()

    suite.setHover({ scale: `${BASE_SIZE_FALLBACK * 2}px` }, null)

    expect(cssVar(refs.root, ARROW_RADIUS_VAR)).toBe(`${BASE_SIZE_FALLBACK}px`)
  })
})

describe('recompute — pill shape', () => {
  it('sizes the follower box to the label and skips the circle floor', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover({ shape: 'pill', label: 'View Project' }, null)

    expect(refs.root.getAttribute(SHAPE_ATTR)).toBe('pill')
    // pillGeometry(100, 14, 18, 8) — pads fall back to constants with no stylesheet.
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('136px')
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe('30px')
    // The follower morphs via its own width/height, so the circle scale is left
    // alone — no ring-shrink and no label-fit growth.
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('')
  })

  /** With a stylesheet present the pads come from the tunable vars — and the
      style read happens once, however many pills a page hovers. */
  it('reads the pill padding from the computed vars, once', () => {
    const vars: Record<string, string> = { [PILL_PAD_X_VAR]: '20', [PILL_PAD_Y_VAR]: '10' }
    const styles = vi.fn(() => ({ getPropertyValue: (name: string) => vars[name] ?? '' }))
    vi.stubGlobal('getComputedStyle', styles)
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover({ shape: 'pill', label: 'View' }, null)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('140px')
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe('34px')

    suite.setHover({ shape: 'pill', label: 'Other' }, null)
    expect(styles).toHaveBeenCalledOnce()
  })

  it('clears the shape vars when the shape returns to a circle', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)
    suite.setHover({ shape: 'pill', label: 'View Project' }, null)

    suite.setHover({ label: 'View Project' }, null)

    expect(refs.root.hasAttribute(SHAPE_ATTR)).toBe(false)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('')
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe('')
  })
})

/**
 * Reservation: an active INSIDE arrow pair grows the shape so the chevrons get
 * real room instead of overlaying the content. Expectations derive from the
 * same constants the engine composes (pads 18/8; depth = gap + size×⅓ per
 * side; breadth = size×⅔ flooring the cross axis) so retuning a default
 * fallback keeps locking the FORMULA rather than a stale number.
 */
describe('recompute — arrows reserve room in the shape', () => {
  const RES = ARROW_GAP_FALLBACK + ARROW_SIZE_FALLBACK * ARROW_DEPTH_RATIO
  const BREADTH = ARROW_SIZE_FALLBACK * ARROW_BREADTH_RATIO

  it('widens a labeled pill on the horizontal axis when arrows go active', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)
    suite.setHover({ shape: 'pill', label: 'Drag' }, null)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('136px')

    suite.setHover({ shape: 'pill', label: 'Drag', arrows: 'horizontal' }, null)

    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe(`${100 + 2 * (18 + RES)}px`)
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe(`${Math.max(14, BREADTH) + 2 * 8}px`)
  })

  /** The near-square a vertical pair makes of a stadium reads as neither pill
      nor circle, so the shape falls back to the ring and the floor takes over. */
  it('demotes a labeled pill to the circle for a vertical-only inside pair', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover({ shape: 'pill', label: 'Drag', arrows: 'vertical' }, null)

    expect(refs.root.hasAttribute(SHAPE_ATTR)).toBe(false)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('')
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe(
      String((Math.hypot(100, 14) + 2 * (HINT_FIT_MARGIN + RES)) / BASE_SIZE_FALLBACK)
    )
  })

  /** Growing both axes makes a rounded square of the stadium — neither pill
      nor circle, same call as the vertical demotion. */
  it('demotes a labeled pill to the circle for an "all" pair', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover({ shape: 'pill', label: 'Drag', arrows: 'all' }, null)

    expect(refs.root.hasAttribute(SHAPE_ATTR)).toBe(false)
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe(
      String((Math.hypot(100, 14) + 2 * (HINT_FIT_MARGIN + RES)) / BASE_SIZE_FALLBACK)
    )
  })

  it('leaves a labeled pill untouched when the pair seats outside the edge', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover(
      { shape: 'pill', label: 'Drag', arrows: 'horizontal', arrowsPosition: 'outside' },
      null
    )

    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('136px')
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe('30px')
  })

  it('establishes a pill box from arrows alone when there is no label or icon', () => {
    const suite = build()

    suite.setHover({ shape: 'pill', arrows: 'horizontal' }, null)

    expect(refs.root.getAttribute(SHAPE_ATTR)).toBe('pill')
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe(`${2 * (18 + RES)}px`)
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe(`${BREADTH + 2 * 8}px`)
  })

  /** No label means no width competition, so the shape can commit to the
      vertical axis: the transpose of the horizontal arrows-only stadium, with
      the wide padding + reservation on the long axis and the snug padding
      across. */
  it('builds a vertical stadium from a vertical pair alone', () => {
    const suite = build()

    suite.setHover({ shape: 'pill', arrows: 'vertical' }, null)

    expect(refs.root.getAttribute(SHAPE_ATTR)).toBe('pill')
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe(`${BREADTH + 2 * 8}px`)
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe(
      `${Math.max(2 * (18 + RES), BREADTH + 2 * 8)}px`
    )
  })

  /** An arrows-only "all" pill would be a rounded square — demoted like its
      labeled sibling, to the plain base circle with all four arrows inside. */
  it('demotes an arrows-only "all" pill to the base circle', () => {
    const suite = build()

    suite.setHover({ shape: 'pill', arrows: 'all' }, null)

    expect(refs.root.hasAttribute(SHAPE_ATTR)).toBe(false)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('')
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('')
  })

  /** The pressed clamp squeezes a pill along its own long axis only, so the
      suite marks which axis that is together with the shape itself. */
  it('marks a horizontal pill with axis x and a vertical stadium with axis y', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover({ shape: 'pill', label: 'Drag' }, null)
    expect(refs.root.getAttribute(SHAPE_AXIS_ATTR)).toBe('x')

    suite.setHover({ shape: 'pill', arrows: 'horizontal' }, null)
    expect(refs.root.getAttribute(SHAPE_AXIS_ATTR)).toBe('x')

    suite.setHover({ shape: 'pill', arrows: 'vertical' }, null)
    expect(refs.root.getAttribute(SHAPE_AXIS_ATTR)).toBe('y')
  })

  it('drops the axis mark whenever no pill is up', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)
    suite.setHover({ shape: 'pill', label: 'Drag' }, null)
    expect(refs.root.hasAttribute(SHAPE_AXIS_ATTR)).toBe(true)

    suite.setHover({ shape: 'pill', label: 'Drag', arrows: 'vertical' }, null)

    // Demoted to the circle — the axis mark must go with the shape.
    expect(refs.root.hasAttribute(SHAPE_AXIS_ATTR)).toBe(false)
  })

  /** The pill styling keys on data-cursor-shape alone — the label stays inert,
      so nothing fades an empty text slot in or out. */
  it('keeps HINT_ATTR unraised for an arrows-only pill', () => {
    const suite = build()

    suite.setHover({ shape: 'pill', arrows: 'horizontal' }, null)

    expect(refs.root.hasAttribute(HINT_ATTR)).toBe(false)
  })

  it('keeps falling back to the circle for a bare pill shape with no label and no arrows', () => {
    const suite = build()

    suite.setHover({ shape: 'pill' }, null)

    expect(refs.root.hasAttribute(SHAPE_ATTR)).toBe(false)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('')
  })

  it('retracts a previously shown label when an arrows-only pill takes over', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)
    suite.setHover({ shape: 'pill', label: 'Drag' }, null)
    expect(refs.root.hasAttribute(HINT_ATTR)).toBe(true)

    suite.setHover({ shape: 'pill', arrows: 'horizontal' }, null)

    expect(refs.root.hasAttribute(HINT_ATTR)).toBe(false)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe(`${2 * (18 + RES)}px`)
  })

  it('floors a labeled circle bigger to clear an active inside arrow pair', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 30, 16)

    suite.setHover({ label: 'View', arrows: 'horizontal', scale: '10px' }, null)

    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe(
      String(
        (Math.hypot(30, Math.max(16, BREADTH)) + 2 * (HINT_FIT_MARGIN + RES)) / BASE_SIZE_FALLBACK
      )
    )
  })

  it('leaves a bare circle with no label untouched by active arrows', () => {
    const suite = build()

    suite.setHover({ arrows: 'all' }, null)

    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('')
    expect(cssVar(refs.root, ARROW_RADIUS_VAR)).toBe(`${BASE_SIZE_FALLBACK / 2}px`)
  })

  it('does not inflate the circle floor when the pair seats outside', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 30, 16)

    suite.setHover(
      { label: 'View', arrows: 'horizontal', arrowsPosition: 'outside', scale: '10px' },
      null
    )

    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe(String(42 / BASE_SIZE_FALLBACK))
  })

  /** The radius var stays written under a pill — inert there purely because the
      CSS reach calc prefers the shape vars; locks that precedence contract. */
  it('keeps writing the arrow radius var even while a pill shape is active', () => {
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover({ shape: 'pill', label: 'Drag', arrows: 'horizontal' }, null)

    expect(cssVar(refs.root, ARROW_RADIUS_VAR)).toBe(`${BASE_SIZE_FALLBACK / 2}px`)
  })

  /** One read for the pads, one for the size + gap pair — never per hover. */
  it('reads the arrow size and gap from the computed vars, once', () => {
    const vars: Record<string, string> = { [ARROW_GAP_VAR]: '4', [ARROW_SIZE_VAR]: '24' }
    const styles = vi.fn(() => ({ getPropertyValue: (name: string) => vars[name] ?? '' }))
    vi.stubGlobal('getComputedStyle', styles)
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)

    suite.setHover({ shape: 'pill', label: 'Drag', arrows: 'horizontal' }, null)
    // Depth 4 + 24×⅓ = 12: width 100 + 2×(18+12), height max(14, 24×⅔) + 2×8.
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('160px')
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe('32px')

    suite.setHover({ shape: 'pill', label: 'Other', arrows: 'horizontal' }, null)
    expect(styles).toHaveBeenCalledTimes(2)
  })

  it('re-reads the arrow size and gap after remeasure', () => {
    const vars: Record<string, string> = { [ARROW_GAP_VAR]: '4', [ARROW_SIZE_VAR]: '24' }
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => vars[name] ?? ''
    }))
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)
    suite.setHover({ shape: 'pill', label: 'Drag', arrows: 'horizontal' }, null)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('160px')

    vars[ARROW_GAP_VAR] = '0'
    vars[ARROW_SIZE_VAR] = '12'
    suite.remeasure()

    // Depth 0 + 12×⅓ = 4: width 100 + 2×(18+4), height max(14, 12×⅔) + 2×8.
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('144px')
    expect(cssVar(refs.root, SHAPE_HEIGHT_VAR)).toBe('30px')
  })
})

describe('recompute — colours', () => {
  it('writes what the payload names and removes what it drops', () => {
    const suite = build()

    suite.setHover({ textColor: 'red', backgroundColor: 'blue' }, null)
    expect(cssVar(refs.root, TEXT_COLOR_VAR)).toBe('red')
    expect(cssVar(refs.root, BG_VAR)).toBe('blue')

    suite.setHover({}, null)
    expect(cssVar(refs.root, TEXT_COLOR_VAR)).toBe('')
    expect(cssVar(refs.root, BG_VAR)).toBe('')
  })
})

describe('recompute — write dedupe', () => {
  /** recompute re-runs on every layer change; a value that did not change must
      not be rewritten — an identical setProperty still dirties style. */
  it('does not rewrite custom properties whose values have not changed', () => {
    const suite = build()
    const payload = { textColor: 'red', scale: `${BASE_SIZE_FALLBACK * 2}px` }
    suite.setHover(payload, null)

    const follower = refs.follower as HTMLElement
    const writes = [
      vi.spyOn(refs.root.style, 'setProperty'),
      vi.spyOn(refs.root.style, 'removeProperty'),
      vi.spyOn(follower.style, 'setProperty'),
      vi.spyOn(follower.style, 'removeProperty')
    ]
    suite.setHover(payload, null)
    const rewrites = writes.reduce((sum, spy) => sum + spy.mock.calls.length, 0)
    for (const spy of writes) {
      spy.mockRestore()
    }

    expect(rewrites).toBe(0)
  })

  /** The other redundancy guard: leaving while nothing is hovered does no
      recompute at all. */
  it('does not recompute for a clearHover with nothing hovered', () => {
    const suite = build()
    const toggles = vi.spyOn(refs.root, 'toggleAttribute')

    suite.clearHover()

    expect(toggles).not.toHaveBeenCalled()
  })
})

describe('recompute — offset', () => {
  it('nudges a label clear of the pointer and retracts the nudge with it', () => {
    const suite = build()

    suite.setHover({ label: 'View' }, null)
    // Var references, not literals: the kit controls own both distances, the
    // constants are only their fallbacks.
    expect(cssVar(refs.root, OFFSET_X_VAR)).toBe('var(--arts-cursor-hint-offset-x, 0px)')
    expect(cssVar(refs.root, OFFSET_Y_VAR)).toBe('var(--arts-cursor-hint-offset-y, -28px)')

    suite.setHover({}, null)
    expect(cssVar(refs.root, OFFSET_X_VAR)).toBe('')
    expect(cssVar(refs.root, OFFSET_Y_VAR)).toBe('')
  })

  it('takes an explicit offset over the label nudge', () => {
    const suite = build()

    suite.setHover({ label: 'View', offset: [4, 8] }, null)

    expect(cssVar(refs.root, OFFSET_X_VAR)).toBe('4px')
    expect(cssVar(refs.root, OFFSET_Y_VAR)).toBe('8px')
  })
})

describe('recompute — label and icon', () => {
  it('raises the label attribute and fills the element', () => {
    const suite = build()

    suite.setHover({ label: 'View' }, null)

    expect(refs.root.hasAttribute(HINT_ATTR)).toBe(true)
    expect(refs.hint?.textContent).toBe('View')
  })

  /** The text has to survive the hide transition, or it vanishes mid-fade. */
  it('lowers the label attribute but keeps the text until the transition ends', () => {
    const suite = build()
    suite.setHover({ label: 'View' }, null)

    suite.clearHover()

    expect(refs.root.hasAttribute(HINT_ATTR)).toBe(false)
    expect(refs.hint?.textContent).toBe('View')
  })

  it('injects the payload icon into its slot and flags the side', () => {
    const suite = build()

    suite.setHover({ label: 'Visit', icon: '<svg></svg>', iconPosition: 'before' }, null)

    expect(refs.hintText?.textContent).toBe('Visit')
    expect(refs.hintIcon?.querySelector('svg')).toBeTruthy()
    expect(refs.root.getAttribute(HINT_ICON_ATTR)).toBe('before')
  })

  it('defaults the icon after the label and clears it when the icon is dropped', () => {
    const suite = build()
    suite.setHover({ label: 'Visit', icon: '<svg></svg>' }, null)
    expect(refs.root.getAttribute(HINT_ICON_ATTR)).toBe('after')

    suite.setHover({ label: 'Visit' }, null)

    expect(refs.hintIcon?.querySelector('svg')).toBeNull()
    expect(refs.root.hasAttribute(HINT_ICON_ATTR)).toBe(false)
  })
})

/**
 * The retract only lowers the attribute synchronously; the content is cleared
 * after the hide transition (transitionend, or a timeout as the backstop) so it
 * does not vanish mid-fade. Driving the timer proves the second half runs — and
 * that a newer recompute re-showing the part cancels the stale clear.
 */
describe('recompute — content retract completes after the transition', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('clears the label text and icon once the transition backstop fires', () => {
    const suite = build()
    suite.setHover({ label: 'View', icon: '<svg></svg>' }, null)

    suite.clearHover()
    vi.runOnlyPendingTimers()

    expect(refs.hintText?.textContent).toBe('')
    expect(refs.hintIcon?.innerHTML).toBe('')
    expect(refs.root.hasAttribute(HINT_ICON_ATTR)).toBe(false)
  })

  it('keeps a re-shown label when the stale hide transition fires', () => {
    const suite = build()
    suite.setHover({ label: 'View' }, null)
    suite.clearHover()
    suite.setHover({ label: 'View' }, null)

    vi.runOnlyPendingTimers()

    expect(refs.root.hasAttribute(HINT_ATTR)).toBe(true)
    expect(refs.hintText?.textContent).toBe('View')
  })

  /** Both finish routes fire on a real retract — transitionend, then the
      timeout backstop. The second must be a no-op, not a second clear. */
  it('clears only once when transitionend and the backstop both fire', () => {
    const suite = build()
    suite.setHover({ label: 'View' }, null)
    suite.clearHover()

    ;(refs.hint as HTMLElement).dispatchEvent(new Event('transitionend'))
    expect(refs.hintText?.textContent).toBe('')
    ;(refs.hintText as HTMLElement).textContent = 'sentinel'
    vi.runOnlyPendingTimers()

    expect(refs.hintText?.textContent).toBe('sentinel')
  })
})

/**
 * The clear delay must track the EFFECTIVE duration: the composition root
 * re-derives options.animation from computed CSS (the kit Duration control),
 * and a retract scheduled after that has to wait out the longer transition —
 * not the duration captured when the suite was built.
 */
describe('recompute — clear delay follows the live duration', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('schedules the content clear from the duration at retract time', () => {
    const options = resolveOptions()
    const suite = build(options)
    suite.setHover({ label: 'View' }, null)

    options.animation.duration = 1
    suite.clearHover()
    vi.advanceTimersByTime(DEFAULT_ANIMATION_DURATION * 1000 + CLEAR_DELAY_PAD_MS + 1)
    expect(refs.hintText?.textContent).toBe('View')

    vi.advanceTimersByTime(1000)
    expect(refs.hintText?.textContent).toBe('')
  })
})

/**
 * Adopted markup may lack the follower slot; the lazy style readers then have
 * nothing to measure and fall back to the constants instead of throwing.
 */
describe('recompute — adopted markup without a follower', () => {
  const buildNoFollower = () => {
    html = document.createElement('html')
    const root = document.createElement('div')
    const hint = document.createElement('div')
    const hintText = document.createElement('div')
    const hintIcon = document.createElement('div')
    hint.append(hintText, hintIcon)
    root.append(hint)
    refs = { root, follower: null, hint, hintText, hintIcon, built: false }
    return createEffectsSuite({ refs, options: resolveOptions(), geometry: geometry(), html })
  }

  it('sizes a pill and a scaled border off the constants when there is no follower', () => {
    const suite = buildNoFollower()
    sized(refs.hint as HTMLElement, 100, 14)

    expect(() => suite.setHover({ shape: 'pill', label: 'Go', scale: '30px' }, null)).not.toThrow()
    expect(refs.root.getAttribute(SHAPE_ATTR)).toBe('pill')
  })

  /** handlePress writes the follower var through setVar directly — with no
      follower the write lands nowhere, while the root mirror still runs. */
  it('presses and releases with the root mirror alone', () => {
    const suite = buildNoFollower()
    const event = {
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false
    } as PointerEvent

    expect(suite.handlePress(event)).toBe(0.8)
    expect(cssVar(refs.root, PRESS_VAR)).toBe('0.8')

    expect(suite.handleRelease(event)).toBe(true)
    expect(cssVar(refs.root, PRESS_VAR)).toBe('')
  })
})

/**
 * Adopted markup whose label carries no text/icon slots: the text falls back
 * onto the label element itself and the icon is skipped — on fill and on the
 * deferred clear alike.
 */
describe('recompute — adopted markup without label slots', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const buildSlotless = () => {
    html = document.createElement('html')
    const root = document.createElement('div')
    const follower = document.createElement('div')
    const hint = document.createElement('div')
    root.append(follower, hint)
    refs = { root, follower, hint, hintText: null, hintIcon: null, built: false }
    return createEffectsSuite({ refs, options: resolveOptions(), geometry: geometry(), html })
  }

  it('writes the text onto the label element itself and skips the icon', () => {
    const suite = buildSlotless()

    suite.setHover({ label: 'View', icon: '<svg></svg>' }, null)

    expect(refs.root.hasAttribute(HINT_ATTR)).toBe(true)
    expect(refs.hint?.textContent).toBe('View')
  })

  it('clears the fallback text once the retract transition ends', () => {
    const suite = buildSlotless()
    suite.setHover({ label: 'View' }, null)

    suite.clearHover()
    vi.runOnlyPendingTimers()

    expect(refs.hint?.textContent).toBe('')
  })
})

/**
 * offsetWidth/Height is a forced layout; the same label recurs across a page's
 * links, so the measured box is memoized by (text, icon). happy-dom exposes no
 * `document.fonts`, so the webfont-swap invalidation is driven by defining one
 * with a controllable `ready` promise.
 */
describe('recompute — label box memo', () => {
  /** Counting getter on the label box — each miss reads offsetWidth once. */
  const countMeasures = () => {
    let reads = 0
    Object.defineProperty(refs.hint as HTMLElement, 'offsetWidth', {
      configurable: true,
      get: () => {
        reads++
        return 100
      }
    })
    Object.defineProperty(refs.hint as HTMLElement, 'offsetHeight', {
      configurable: true,
      get: () => 14
    })
    return () => reads
  }

  it('measures a label box once across repeated hovers of the same text', () => {
    const suite = build()
    const reads = countMeasures()

    suite.setHover({ label: 'View' }, null)
    suite.setHover({ label: 'View' }, null)
    suite.setHover({ label: 'View' }, null)

    expect(reads()).toBe(1)
  })

  it('re-measures for a different label', () => {
    const suite = build()
    const reads = countMeasures()

    suite.setHover({ label: 'View' }, null)
    suite.setHover({ label: 'Read more' }, null)

    expect(reads()).toBe(2)
  })

  it('re-measures when the icon changes the box, same text', () => {
    const suite = build()
    const reads = countMeasures()

    suite.setHover({ label: 'View' }, null)
    suite.setHover({ label: 'View', icon: '<svg></svg>' }, null)

    expect(reads()).toBe(2)
  })

  /** The initial webfont load changes every box the memo holds — fonts.ready
      clears it once settled, so the next hover measures against the real font. */
  it('re-measures after the webfonts settle', async () => {
    let settle = () => {}
    const ready = new Promise<void>((resolve) => {
      settle = resolve
    })
    Object.defineProperty(document, 'fonts', { value: { ready }, configurable: true })
    const suite = build()
    const reads = countMeasures()

    suite.setHover({ label: 'View' }, null)
    suite.setHover({ label: 'View' }, null)
    expect(reads()).toBe(1)

    settle()
    await ready
    suite.setHover({ label: 'View' }, null)

    expect(reads()).toBe(2)
    Reflect.deleteProperty(document, 'fonts')
  })
})

/**
 * A host can retune the measured theming vars at runtime — the Elementor editor
 * live-previews Site Settings — and remeasure() re-samples them, then reapplies
 * the current state. The size read targets the custom property rather than
 * offsetWidth: the follower transitions width/height and a pill overrides them,
 * while an unregistered custom property always reports the settled value. The
 * var name is asserted as a literal on purpose — it is the public contract with
 * kit CSS, so a renamed constant must not silently retarget these tests.
 */
describe('remeasure', () => {
  const stubVars = (vars: Record<string, string>) =>
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => vars[name] ?? ''
    }))

  it('adopts a px size var as the new scale base and reapplies the active hover', () => {
    stubVars({ '--arts-cursor-size': '20px' })
    const suite = build()
    suite.setHover({ scale: '120px' }, null)
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('2')

    suite.remeasure()

    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe(String(120 / 20))
  })

  it('keeps the base when the size var is absent or not in px', () => {
    const vars: Record<string, string> = { '--arts-cursor-size': '' }
    stubVars(vars)
    const suite = build()
    suite.setHover({ scale: '120px' }, null)

    suite.remeasure()
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('2')

    // A theme override in another unit is unparseable without a layout read —
    // never adopted, never corrupting the ratios.
    vars['--arts-cursor-size'] = 'calc(60px + 2vw)'
    suite.remeasure()
    expect(cssVar(refs.follower as HTMLElement, SCALE_VAR)).toBe('2')
  })

  it('leaves the border width to kit CSS unless a payload sets one', () => {
    const vars: Record<string, string> = { [BORDER_WIDTH_VAR]: '2px' }
    stubVars(vars)
    const suite = build()
    // Scale with no explicit width → nothing written: the stylesheet divides the
    // cascade value by the scale var, and an inline write here would beat the
    // per-state kit rules (the Border Width controls ride exactly those).
    suite.setHover({ scale: `${BASE_SIZE_FALLBACK * 2}px` }, null)
    expect(cssVar(refs.root, BORDER_WIDTH_VAR)).toBe('')

    suite.remeasure()
    expect(cssVar(refs.root, BORDER_WIDTH_VAR)).toBe('')

    // An explicit payload width still wins, written inline verbatim.
    suite.setHover({ borderWidth: 3 }, null)
    expect(cssVar(refs.root, BORDER_WIDTH_VAR)).toBe('3px')
  })

  it('re-reads the pill padding', () => {
    const vars: Record<string, string> = { [PILL_PAD_X_VAR]: '20', [PILL_PAD_Y_VAR]: '10' }
    stubVars(vars)
    const suite = build()
    sized(refs.hint as HTMLElement, 100, 14)
    suite.setHover({ shape: 'pill', label: 'View' }, null)
    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('140px')

    vars[PILL_PAD_X_VAR] = '30'
    suite.remeasure()

    expect(cssVar(refs.root, SHAPE_WIDTH_VAR)).toBe('160px')
  })

  it('clears the label box memo so the next pass measures against fresh styles', () => {
    const suite = build()
    let reads = 0
    Object.defineProperty(refs.hint as HTMLElement, 'offsetWidth', {
      configurable: true,
      get: () => {
        reads++
        return 100
      }
    })
    Object.defineProperty(refs.hint as HTMLElement, 'offsetHeight', {
      configurable: true,
      get: () => 14
    })
    suite.setHover({ label: 'View' }, null)
    expect(reads).toBe(1)

    suite.remeasure()

    expect(reads).toBe(2)
  })

  it('is inert without a follower', () => {
    html = document.createElement('html')
    const root = document.createElement('div')
    const hint = document.createElement('div')
    root.append(hint)
    refs = {
      root,
      follower: null,
      hint,
      hintText: null,
      hintIcon: null,
      built: false
    }
    const suite = createEffectsSuite({
      refs,
      options: resolveOptions(),
      geometry: geometry(),
      html
    })

    expect(() => suite.remeasure()).not.toThrow()
  })
})

describe('recompute — attributes and document flags', () => {
  it('mirrors the arrows payload and clears it when dropped', () => {
    const suite = build()

    suite.setHover({ arrows: 'horizontal', arrowsPosition: 'outside' }, null)
    expect(refs.root.getAttribute(ARROWS_ATTR)).toBe('horizontal')
    expect(refs.root.getAttribute(ARROWS_POSITION_ATTR)).toBe('outside')

    suite.setHover({}, null)
    expect(refs.root.hasAttribute(ARROWS_ATTR)).toBe(false)
    expect(refs.root.hasAttribute(ARROWS_POSITION_ATTR)).toBe(false)
  })

  /** Eligibility only — the scale-up itself is the stylesheet reacting to
      data-cursor-pressed, which spans the whole press-drag gesture. */
  it('mirrors the dot payload and clears it when dropped', () => {
    const suite = build()

    suite.setHover({ dot: true }, null)
    expect(refs.root.hasAttribute(DOT_ATTR)).toBe(true)

    suite.setHover({}, null)
    expect(refs.root.hasAttribute(DOT_ATTR)).toBe(false)
  })

  it('treats `arrows: false` as no arrows rather than as the string', () => {
    const suite = build()

    suite.setHover({ arrows: false }, null)

    expect(refs.root.hasAttribute(ARROWS_ATTR)).toBe(false)
  })

  it('flags the document while a payload asks to hide the native cursor', () => {
    const suite = build()

    const release = suite.addSession({ hideNativeCursor: true, showProgressCursor: true })
    expect(html.classList.contains(HTML_NO_NATIVE)).toBe(true)
    expect(html.classList.contains(HTML_PROGRESS)).toBe(true)

    release()
    expect(html.classList.contains(HTML_NO_NATIVE)).toBe(false)
    expect(html.classList.contains(HTML_PROGRESS)).toBe(false)
  })

  it('highlights only while the merged view says so', () => {
    const suite = build()

    suite.setHover({ highlight: true }, null)
    expect(refs.root.hasAttribute(HIGHLIGHT_ATTR)).toBe(true)

    suite.clearHover()
    expect(refs.root.hasAttribute(HIGHLIGHT_ATTR)).toBe(false)
  })
})

/**
 * The merged view IS the refcount: two overlapping loaders must not leave the
 * flag lowered when only the first is released.
 */
describe('sessions', () => {
  it('keeps a flag raised until the last session holding it is released', () => {
    const suite = build()

    const first = suite.addSession({ showLoadingAnimation: true })
    const second = suite.addSession({ showLoadingAnimation: true })

    first()
    expect(refs.root.hasAttribute(LOADING_ATTR)).toBe(true)

    second()
    expect(refs.root.hasAttribute(LOADING_ATTR)).toBe(false)
  })

  it('ignores a session released twice', () => {
    const suite = build()
    const release = suite.addSession({ showLoadingAnimation: true })
    const other = suite.addSession({ showLoadingAnimation: true })

    release()
    release()

    expect(refs.root.hasAttribute(LOADING_ATTR)).toBe(true)
    other()
  })

  it('stacks a session over the hover payload', () => {
    const suite = build()

    suite.setHover({ textColor: 'red' }, null)
    const release = suite.addSession({ textColor: 'blue' })
    expect(cssVar(refs.root, TEXT_COLOR_VAR)).toBe('blue')

    release()
    expect(cssVar(refs.root, TEXT_COLOR_VAR)).toBe('red')
  })
})

describe('press', () => {
  const press = (over: Partial<PointerEvent> = {}) =>
    ({
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...over
    }) as PointerEvent

  it('marks the root pressed and writes the click scale', () => {
    const suite = build()

    suite.handlePress(press())

    expect(refs.root.hasAttribute(PRESSED_ATTR)).toBe(true)
    expect(cssVar(refs.follower as HTMLElement, SCALE_PRESSED_VAR)).not.toBe('')
    // Mirrored onto the root (inheriting) so the arrows re-seat on the pressed
    // ring — the follower's registered var can't reach them.
    expect(cssVar(refs.root, PRESS_VAR)).not.toBe('')
  })

  /** The composition root forwards the ratio to the magnetic trap, so the
      engaged element shrinks by the same factor as the ring. */
  it('reports the applied ratio and the lifting release', () => {
    const suite = build()

    // Default pressScale: { ref: 'cursor', factor: 0.8 } → ratio of the base.
    expect(suite.handlePress(press())).toBe(0.8)
    expect(suite.handleRelease(press())).toBe(true)
  })

  it('reports nothing when the click scale is off or the press is gated', () => {
    const off = build(resolveOptions({ pressScale: false }))
    expect(off.handlePress(press())).toBeNull()

    const suite = build()
    expect(suite.handlePress(press({ button: 2 }))).toBeNull()
    expect(suite.handleRelease(press({ button: 2 }))).toBe(false)
  })

  /** A modified or non-primary click belongs to the browser, not the cursor. */
  it('ignores a modified or secondary press', () => {
    const suite = build()

    suite.handlePress(press({ button: 2 }))
    suite.handlePress(press({ metaKey: true }))
    suite.handlePress(press({ shiftKey: true }))
    suite.handlePress(press({ ctrlKey: true }))
    suite.handlePress(press({ altKey: true }))

    expect(refs.root.hasAttribute(PRESSED_ATTR)).toBe(false)
  })

  it('clears the pressed state on the matching release', () => {
    const suite = build()
    suite.handlePress(press())

    suite.handleRelease(press())

    expect(refs.root.hasAttribute(PRESSED_ATTR)).toBe(false)
    expect(cssVar(refs.follower as HTMLElement, SCALE_PRESSED_VAR)).toBe('')
    expect(cssVar(refs.root, PRESS_VAR)).toBe('')
  })

  it('leaves the pressed state alone when a secondary button is released', () => {
    const suite = build()
    suite.handlePress(press())

    suite.handleRelease(press({ button: 2 }))

    expect(refs.root.hasAttribute(PRESSED_ATTR)).toBe(true)
  })

  it('does nothing at all while pressScale is switched off', () => {
    const suite = build(resolveOptions({ pressScale: false }))

    suite.handlePress(press())

    expect(refs.root.hasAttribute(PRESSED_ATTR)).toBe(false)
  })

  /** A click scale that names 'target' can't resolve without a hovered element,
      so the press falls back to a unit scale rather than writing nothing. */
  it('falls back to a unit press scale when the click scale cannot resolve', () => {
    const suite = build(resolveOptions({ pressScale: { scale: 'target' } }))

    suite.handlePress(press())

    expect(refs.root.hasAttribute(PRESSED_ATTR)).toBe(true)
    expect(cssVar(refs.follower as HTMLElement, SCALE_PRESSED_VAR)).toBe('1')
  })
})

describe('dispose', () => {
  it('drops every layer and both document flags', () => {
    const suite = build()
    suite.setHover({ textColor: 'red' }, null)
    suite.addSession({ hideNativeCursor: true })

    suite.dispose()

    expect(cssVar(refs.root, TEXT_COLOR_VAR)).toBe('')
    expect(html.classList.contains(HTML_NO_NATIVE)).toBe(false)
  })

  /** A session handle can outlive the engine — a loader released after teardown
      must be inert, not a splice into a list dispose already emptied. */
  it('tolerates a release arriving after dispose', () => {
    const suite = build()
    const release = suite.addSession({ showLoadingAnimation: true })
    suite.dispose()

    expect(() => release()).not.toThrow()
  })
})

describe('the section appliers', () => {
  it('applyHint reports pill geometry without flooring the circle scale', () => {
    build()
    sized(refs.hint as HTMLElement, 100, 14)

    const out = applyHint(
      { label: 'View', shape: 'pill' },
      refs,
      refs.root,
      new Map(),
      () => ({ x: 18, y: 8 }),
      () => ({ gap: 8, size: 16 }),
      60,
      100
    )

    expect(out.labelFit).toBe(0)
    expect(out.pill).toEqual({ width: 136, height: 30 })
  })
})
