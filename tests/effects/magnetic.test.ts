import { ELEMENT_RETURN_EPS } from '@ts/constants'
import {
  atRest,
  composeElementScale,
  composeTransition,
  createMagnetic,
  easePull,
  writePull
} from '@ts/effects/magnetic'
import type { IFrameState, IPullRecord } from '@ts/interfaces'
import type { TStyledElement } from '@ts/types'
import { describe, expect, it } from 'vitest'
import { makeFrameState } from '../support'

/**
 * The magnetic trap writes a per-frame `translate`, which a theme's
 * `transition: all` would re-animate into mush, and a pressed `scale` that must
 * ease with the cursor's own tokens. The override is last-wins, so it has to be
 * appended to whatever the element already computes — without clobbering the
 * element's own transitions.
 *
 * These inputs are the shapes a real browser returns from
 * getComputedStyle(el).transition. Testing this through a fake DOM would prove
 * nothing: both jsdom and happy-dom return '' there, which no browser ever does.
 */

describe('composeTransition', () => {
  it('appends the override so existing transitions keep easing', () => {
    expect(composeTransition('all 0s ease 0s', 'translate 0s')).toBe('all 0s ease 0s, translate 0s')
    expect(composeTransition('opacity 0.3s ease 0s, color 0.2s linear 0s', 'translate 0s')).toBe(
      'opacity 0.3s ease 0s, color 0.2s linear 0s, translate 0s'
    )
  })

  /** Appending to a base with no property list would build an invalid
      declaration the browser drops wholesale, taking the override with it. */
  it('replaces outright when there is nothing to preserve', () => {
    expect(composeTransition('none 0s ease 0s', 'translate 0s')).toBe('translate 0s')
    expect(composeTransition('none', 'translate 0s')).toBe('translate 0s')
  })

  it('handles the empty string a non-browser DOM returns', () => {
    expect(composeTransition('', 'translate 0s')).toBe('translate 0s')
  })

  /** The trap's real override carries two properties — the instant translate
      and the eased pressed scale — in one append. */
  it('carries a multi-property override in one append', () => {
    expect(composeTransition('color 0.2s linear 0s', 'translate 0s, scale 0.25s ease')).toBe(
      'color 0.2s linear 0s, translate 0s, scale 0.25s ease'
    )
  })

  it('always ends up overriding the trap-owned properties', () => {
    for (const base of ['all 0s ease 0s', 'none 0s ease 0s', '', 'transform 1s']) {
      expect(composeTransition(base, 'translate 0s').endsWith('translate 0s')).toBe(true)
    }
  })
})

/**
 * One inline property, two features writing it: the resting shrink an
 * engagement applies and the press ratio mirrored from the ring. Everything the
 * trap writes to `element.style.scale` goes through here, so these four cases
 * are the whole contract.
 */
describe('composeElementScale', () => {
  it('writes the resting shrink when nothing is pressed', () => {
    expect(composeElementScale(0.95, null)).toBe('0.95')
  })

  it('writes the press ratio when nothing is resting', () => {
    expect(composeElementScale(null, 0.8)).toBe('0.8')
  })

  /** Flat replacement, not a product: a press reads as one depth whatever the
      element's resting shrink is. 0.95 × 0.8 would be 0.76. */
  it('lets the press replace the resting shrink rather than compound it', () => {
    expect(composeElementScale(0.95, 0.8)).toBe('0.8')
    // The accepted consequence: a resting shrink below the press ratio makes
    // pressing GROW the element. Deliberate — don't "fix" it into a product.
    expect(composeElementScale(0.5, 0.8)).toBe('0.8')
  })

  /** Not '1' — an inline `scale: 1` would override the element's own CSS, so
      "no shrink" has to leave the property unset entirely. */
  it('yields the empty string when neither applies', () => {
    expect(composeElementScale(null, null)).toBe('')
  })
})

describe('the pull-record steppers', () => {
  const record = (over: Partial<IPullRecord> = {}): IPullRecord => ({
    pull: { x: 20, y: -10 },
    lastX: Number.NaN,
    lastY: Number.NaN,
    ...over
  })

  it('eases the pull toward the target by the lerp fraction', () => {
    const r = record()
    easePull(r, 0, 0, 0.25)
    expect(r.pull.x).toBeCloseTo(15, 10)
    expect(r.pull.y).toBeCloseTo(-7.5, 10)
  })

  it('rests only when both axes are within the return epsilon of zero', () => {
    expect(
      atRest(record({ pull: { x: ELEMENT_RETURN_EPS / 2, y: -ELEMENT_RETURN_EPS / 2 } }))
    ).toBe(true)
    expect(atRest(record({ pull: { x: ELEMENT_RETURN_EPS * 2, y: 0 } }))).toBe(false)
  })

  it('skips the style write when the quantized pair has not moved', () => {
    const el = { style: { translate: '' } } as unknown as TStyledElement
    const r = record({ pull: { x: 5.04, y: 0 }, lastX: 5, lastY: 0 })

    writePull(el, r)

    expect(el.style.translate).toBe('')

    r.pull.x = 5.16
    writePull(el, r)

    expect(el.style.translate).toBe('5.2px 0px')
    expect(r.lastX).toBe(5.2)
  })
})

/**
 * The live (magnetize) engagement: no element, no zone, the anchor read from
 * the caller's callback each frame. This is the docs/Velum programmatic path —
 * it composes in page space exactly like hover engagement, but its owner is
 * the only thing that can end it.
 */
describe('live engagement (the magnetize path)', () => {
  const makeController = (state: IFrameState) =>
    createMagnetic({
      state,
      options: {
        magnetic: { strength: 0.25, releaseRadius: 120, elementScale: 1 },
        animation: { duration: 0.25, easing: null }
      },
      readScroll: () => {},
      onRelease: () => {}
    })

  it('composes the target at the live anchor plus pointer strain, in page space, under scroll', () => {
    const state = makeFrameState({
      mouseClient: { x: 400, y: 300 },
      scroll: { x: 0, y: 3000 },
      follower: { x: 400, y: 300 }
    })
    const controller = makeController(state)
    controller.engageLive(
      () => ({ x: 500, y: 3400 }),
      () => 0.25
    )

    // enterPageSpace carried the follower across the space switch.
    expect(state.follower.y).toBe(3300)

    expect(controller.composeTarget()).toBe(true)
    // target = anchor + (pointerPage − anchor) × PULL_FACTOR(0.5) × strength(0.25):
    // pointerPage = (400, 3300), d = (−100, −100) → strain −12.5 per axis.
    expect(state.target.x).toBeCloseTo(487.5)
    expect(state.target.y).toBeCloseTo(3387.5)
  })

  it('tracks a moving anchor frame over frame and never releases by distance', () => {
    const state = makeFrameState()
    const controller = makeController(state)
    const anchor = { x: 200, y: 100 }
    controller.engageLive(
      () => anchor,
      () => 0
    )
    controller.composeTarget()
    expect(state.target.x).toBe(200)

    anchor.x = 260
    controller.composeTarget()
    expect(state.target.x).toBe(260)

    // The pointer sits far outside any hover release radius; a live trap holds.
    expect(controller.engaged).toBe(true)
  })

  it('returns the follower to viewport space on release', () => {
    const state = makeFrameState({ scroll: { x: 0, y: 1000 }, follower: { x: 10, y: 20 } })
    const controller = makeController(state)
    controller.engageLive(
      () => ({ x: 0, y: 0 }),
      () => 0
    )
    controller.release()
    expect(state.follower.y).toBe(20)
  })
})
