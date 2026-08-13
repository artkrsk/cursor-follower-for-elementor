// @vitest-environment happy-dom

import { ELEMENT_EASE, FRAME_60, PULL_FACTOR } from '@ts/constants'
import { resolveOptions } from '@ts/core/options'
import { createMagnetic } from '@ts/effects/magnetic'
import type {
  IFrameState,
  IGeometryEntry,
  IMagneticController,
  IResolvedOptions
} from '@ts/interfaces'
import type { TStyledElement } from '@ts/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeFrameState } from '../support'

/**
 * The trap's stateful tier: page-space composition, the per-frame element pull,
 * and the return to rest. composeTransition — the one piece a fake DOM cannot
 * prove anything about — is covered against real browser strings in
 * magnetic.test.ts.
 *
 * Every vector is copied into a fresh state per test: the trap mutates
 * state.follower and state.target in place, so a shared literal would leak.
 */

/** Trap tests presume a pointer that has been seen. */
const state = (over: Partial<IFrameState> = {}) => makeFrameState({ pointerSeen: true, ...over })

/** A 100×100 box whose page-space centre is (150, 150). */
const entry = (over: Partial<IGeometryEntry> = {}): IGeometryEntry => ({
  pageX: 100,
  pageY: 100,
  w: 100,
  h: 100,
  ...over
})

let el: TStyledElement

const trap = (args: {
  state: IFrameState
  options?: IResolvedOptions
  onRelease?: () => void
  readScroll?: () => void
}) =>
  createMagnetic({
    state: args.state,
    options: args.options ?? resolveOptions(),
    readScroll: args.readScroll ?? (() => {}),
    onRelease: args.onRelease ?? (() => {})
  })

beforeEach(() => {
  document.body.innerHTML = '<div id="target"></div>'
  el = document.getElementById('target') as unknown as TStyledElement
})

/** Two neighbouring dots, as on a slider. */
const twoDots = () => {
  document.body.innerHTML = '<div id="a"></div><div id="b"></div>'
  return {
    first: document.getElementById('a') as unknown as TStyledElement,
    second: document.getElementById('b') as unknown as TStyledElement
  }
}

/** A fresh trap with the pointer at (x, y), engaged on `target` (default: the
    shared fixture element). */
const engagedAt = (
  x: number,
  y: number,
  over: { target?: TStyledElement; strength?: number; elementScale?: number } = {}
) => {
  const s = state({ mouseClient: { x, y } })
  const controller = trap({ state: s })
  controller.engage(over.target ?? el, over.strength ?? 1, entry(), undefined, over.elementScale)
  return { controller, s }
}

/** Drain the pull/return ease to rest. */
const settle = (controller: IMagneticController, ticks = 90) => {
  for (let i = 0; i < ticks; i++) {
    controller.tick(FRAME_60)
  }
}

describe('engage', () => {
  it('appends the translate override so the per-frame pull is not re-animated', () => {
    const s = state()

    trap({ state: s }).engage(el, 1, entry())

    // happy-dom computes '' for transition, which is the branch that replaces
    // rather than appends — see composeTransition. The scale entry carries the
    // cursor's animation tokens so a pressed shrink eases in sync with the ring.
    expect(el.style.transition).toBe('translate 0s, scale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)')
  })

  /** Page space is entered by adding the scroll offset to the follower, so the
      space switch never shows as a jump. */
  it('moves the follower into page space', () => {
    const s = state({ follower: { x: 10, y: 20 }, scroll: { x: 0, y: 0 } })
    const controller = trap({
      state: s,
      readScroll: () => {
        s.scroll.x = 5
        s.scroll.y = 100
      }
    })

    controller.engage(el, 1, entry())

    expect(s.follower).toEqual({ x: 15, y: 120 })
    expect(controller.engaged).toBe(true)
  })

  /** The pull rewrites `translate` every frame; without its own layer the
      browser re-rasters the element's area on every write. */
  it('promotes the element onto its own compositor layer for the pull', () => {
    const s = state()

    trap({ state: s }).engage(el, 1, entry())

    expect(el.style.willChange).toBe('translate')
  })

  /** Slider dots sit next to each other: hopping to a neighbour must not cut
      the previous dot's release bounce short. */
  it('keeps easing a replaced element home instead of snapping it', () => {
    const { first, second } = twoDots()
    const { controller } = engagedAt(170, 150, { target: first })
    controller.composeTarget()
    controller.tick(FRAME_60)
    // pullTarget 10px, first frame covers ELEMENT_EASE of it.
    expect(first.style.translate).toBe('2.5px 0px')

    controller.engage(second, 1, entry())
    expect(first.style.translate).toBe('2.5px 0px')

    settle(controller)
    expect(first.style.translate).toBe('')
    expect(first.style.transition).toBe('')
    expect(first.style.willChange).toBe('')
  })

  /** Hopping back to a dot that is still easing home: the engagement takes the
      pull over where it stands, and the returning queue lets go of the element
      so two writers never fight over it. */
  it('re-engaging a returning element adopts its ease instead of restarting', () => {
    const { first, second } = twoDots()
    const { controller } = engagedAt(170, 150, { target: first })
    controller.composeTarget()
    controller.tick(FRAME_60) // 2.5px
    controller.engage(second, 1, entry())
    controller.tick(FRAME_60) // first eases home: 1.875 → 1.9px written

    controller.engage(first, 1, entry())

    // No snap and no restart — the write stream continues from where it was.
    expect(first.style.translate).toBe('1.9px 0px')

    // The returning queue let go: its settle must not strip the overrides off
    // the live engagement (the exact settle value bakes in the anchor's pull
    // correction, so only the overrides are the contract here).
    controller.composeTarget()
    settle(controller, 60)
    expect(first.style.translate).not.toBe('')
    expect(first.style.transition).toBe(
      'translate 0s, scale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
    )
    expect(first.style.willChange).toBe('translate')
  })
})

describe('composeTarget', () => {
  it('is inert while nothing is engaged, so free-roam composes itself', () => {
    const s = state()

    expect(trap({ state: s }).composeTarget()).toBe(false)
  })

  /** The ring sits at the anchor, pulled a fraction of the way to the pointer. */
  it('places the target between the anchor and the pointer', () => {
    const { controller, s } = engagedAt(170, 150)

    expect(controller.composeTarget()).toBe(true)
    // anchor 150 + (pointer 170 − anchor 150) * PULL_FACTOR * strength
    expect(s.target.x).toBe(150 + 20 * PULL_FACTOR)
    expect(s.target.y).toBe(150)
  })

  it('pulls less at a lower strength', () => {
    const { controller, s } = engagedAt(170, 150, { strength: 0.5 })
    controller.composeTarget()

    expect(s.target.x).toBe(150 + 20 * PULL_FACTOR * 0.5)
  })

  /** engage() re-syncs scroll (authoritative), but the per-frame composeTarget
      reads none — state.scroll is kept current by the passive listener, so the
      frame path forces no layout. It composes off whatever scroll the state holds. */
  it('reads scroll at engage but not on the frame path', () => {
    const readScroll = vi.fn()
    const s = state({ mouseClient: { x: 170, y: 150 }, scroll: { x: 0, y: 40 } })
    const controller = trap({ state: s, readScroll })

    controller.engage(el, 1, entry())
    expect(readScroll).toHaveBeenCalledOnce() // engage syncs

    readScroll.mockClear()
    controller.composeTarget()

    expect(readScroll).not.toHaveBeenCalled() // frame path does not
    // pointer page-y = mouseClient.y (150) + scroll.y (40); anchor 150
    expect(s.target.y).toBe(150 + 40 * PULL_FACTOR)
  })

  /** Page space is scroll-invariant, so scrolling moves the POINTER through the
      trap — which is what grows the strain and eventually releases it. */
  it('releases once the pointer strays past the release radius', () => {
    const s = state({ mouseClient: { x: 160, y: 150 } })
    const onRelease = vi.fn()
    const controller = trap({ state: s, onRelease })
    controller.engage(el, 1, entry())

    s.mouseClient.x = 1000

    expect(controller.composeTarget()).toBe(false)
    expect(controller.engaged).toBe(false)
    expect(onRelease).toHaveBeenCalledOnce()
  })

  /** A hover zone wider than the configured radius would otherwise release the
      instant it engaged. */
  it('never releases closer than the distance it engaged at', () => {
    const { controller } = engagedAt(500, 150)

    expect(controller.composeTarget()).toBe(true)
    expect(controller.engaged).toBe(true)
  })
})

describe('pressed scale', () => {
  /** The pressed cursor shrinks by the click-scale ratio; the engaged magnetic
      element mirrors it so the pair reads as one press. */
  it('shrinks the engaged element and restores it when the press lifts', () => {
    const { controller } = engagedAt(150, 150)

    controller.setPressedScale(0.75)
    expect(el.style.scale).toBe('0.75')

    controller.setPressedScale(null)
    expect(el.style.scale).toBe('')
  })

  /** Hovering into a magnetic element while the button is already down. */
  it('applies a held press to a newly engaged element', () => {
    const s = state({ mouseClient: { x: 150, y: 150 } })
    const controller = trap({ state: s })

    controller.setPressedScale(0.75)
    controller.engage(el, 1, entry())

    expect(el.style.scale).toBe('0.75')
  })

  /** The scale rides the ENGAGEMENT, not the press: leaving the zone while the
      button is still down hands the element back to its own styling. */
  it('hands the scale back when the trap releases', () => {
    const { controller } = engagedAt(150, 150)
    controller.setPressedScale(0.75)

    controller.release()

    expect(el.style.scale).toBe('')
  })

  /** A replaced element eases home unshrunk — the returning queue must not
      strand it at the pressed scale. */
  it('hands the scale back when another element takes the slot', () => {
    const { first, second } = twoDots()
    const { controller } = engagedAt(170, 150, { target: first })
    controller.composeTarget()
    controller.tick(FRAME_60)
    controller.setPressedScale(0.75)

    controller.engage(second, 1, entry())

    expect(first.style.scale).toBe('')
    expect(second.style.scale).toBe('0.75')
  })
})

describe('resting element scale', () => {
  /** The engagement's own shrink — the magnetized element reads as "grabbed"
      whether or not the button is down. */
  it('writes the resting scale at engage and hands it back on release', () => {
    const { controller } = engagedAt(150, 150, { elementScale: 0.95 })
    expect(el.style.scale).toBe('0.95')

    controller.release()

    expect(el.style.scale).toBe('')
  })

  /** The default. An inline `scale: 1` would override whatever the element's
      own CSS sets, so "no shrink" has to leave the property unwritten. */
  it('writes nothing when no resting scale is configured', () => {
    engagedAt(150, 150)

    expect(el.style.scale).toBe('')
  })

  /** Flat replacement in both directions: the press overwrites the resting
      shrink, and lifting it falls back to the resting shrink, not to nothing. */
  it('lets a press replace it, then falls back to it when the press lifts', () => {
    const { controller } = engagedAt(150, 150, { elementScale: 0.95 })

    controller.setPressedScale(0.8)
    expect(el.style.scale).toBe('0.8')

    controller.setPressedScale(null)
    expect(el.style.scale).toBe('0.95')
  })
})

/**
 * restore() strips the composed transition, and removing a transition CANCELS a
 * running one — the property jumps to its target instead of easing there. The
 * pull can rest within a frame (a pointer sitting dead centre never builds one,
 * and neither does a fast flick), so without a hold the element would snap back
 * to full size the moment the pull settled.
 */
describe('the scale-transition hold', () => {
  it('keeps the element owned until the scale transition can finish', () => {
    const { controller } = engagedAt(150, 150, { elementScale: 0.95 })
    controller.release()

    // The pointer sat on the anchor centre, so the pull is already at rest.
    controller.tick(FRAME_60)

    expect(controller.busy).toBe(true)
    expect(el.style.transition).not.toBe('')

    settle(controller)

    expect(controller.busy).toBe(false)
    expect(el.style.transition).toBe('')
  })

  /** No scale was ever written, so there is nothing to outlast — the default
      path keeps its old timing instead of pinning the ticker awake. */
  it('does not hold an element that never carried a scale', () => {
    const { controller } = engagedAt(150, 150)
    controller.release()

    controller.tick(FRAME_60)

    expect(controller.busy).toBe(false)
  })
})

describe('zone-aware release', () => {
  /** A hover zone much larger than its anchor (the edge strip with a
      chevron anchor) must hold the trap anywhere inside the zone — there the
      hover boundary is the release signal, not pointer distance from the
      anchor. Anywhere in the zone resolves to the identical engagement, so a
      distance release inside it can only produce a state a clean re-hover
      would immediately contradict. */
  it('holds the trap inside the zone even past the release radius', () => {
    const s = state({ mouseClient: { x: 500, y: 120 } })
    const controller = trap({ state: s })
    // Anchor dot centred at (150, 150) inside a 800×100 strip.
    controller.engage(el, 1, entry(), entry({ w: 800 }))

    s.mouseClient.x = 850 // ~700px from the anchor, still inside the strip

    expect(controller.composeTarget()).toBe(true)
    expect(controller.engaged).toBe(true)
  })

  /** Scroll strain must survive the zone test: scrolling moves the PAGE-space
      pointer out of the zone rect, and the radius release takes over — the
      release stays geometric and per-frame, independent of the browser's
      post-scroll hover recomputation. */
  it('releases past the radius once scroll carries the pointer out of the zone', () => {
    const s = state({ mouseClient: { x: 150, y: 150 } })
    const onRelease = vi.fn()
    const controller = trap({ state: s, onRelease })
    controller.engage(el, 1, entry(), entry({ w: 800 }))

    s.scroll.y = 1000 // page-space pointer now far below the strip

    expect(controller.composeTarget()).toBe(false)
    expect(controller.engaged).toBe(false)
    expect(onRelease).toHaveBeenCalledOnce()
  })
})

describe('tick', () => {
  it('does nothing at all with no element engaged', () => {
    const controller = trap({ state: state() })

    expect(() => controller.tick(FRAME_60)).not.toThrow()
  })

  it('eases the element toward the pull target', () => {
    const { controller } = engagedAt(170, 150)
    controller.composeTarget()

    controller.tick(FRAME_60)

    // pullTarget 10px, first frame covers ELEMENT_EASE of it.
    expect(el.style.translate).toBe(`${10 * ELEMENT_EASE}px 0px`)
  })

  it('skips the write when the rounded position has not moved', () => {
    const { controller } = engagedAt(150, 150)
    controller.composeTarget()
    controller.tick(FRAME_60)
    const written = el.style.translate

    controller.tick(FRAME_60)

    expect(el.style.translate).toBe(written)
  })

  /** The element keeps easing home after release, then hands its inline styles
      back so the theme's own rules apply again. */
  it('returns the element to rest and clears what it wrote', () => {
    const { controller } = engagedAt(170, 150)
    controller.composeTarget()
    controller.tick(FRAME_60)
    expect(controller.busy).toBe(true)

    controller.release()
    settle(controller, 60)

    expect(el.style.translate).toBe('')
    expect(el.style.transition).toBe('')
    expect(el.style.willChange).toBe('')
    expect(controller.busy).toBe(false)
  })
})

describe('release', () => {
  it('returns the follower to viewport space', () => {
    const s = state({ follower: { x: 10, y: 20 } })
    const controller = trap({
      state: s,
      readScroll: () => {
        s.scroll.x = 5
        s.scroll.y = 100
      }
    })
    controller.engage(el, 1, entry())

    controller.release()

    expect(s.follower).toEqual({ x: 10, y: 20 })
  })

  it('is a no-op when nothing is engaged', () => {
    const s = state({ follower: { x: 10, y: 20 }, scroll: { x: 5, y: 100 } })
    const controller = trap({ state: s })

    controller.release()

    expect(s.follower).toEqual({ x: 10, y: 20 })
  })
})

describe('live sessions', () => {
  it('follows the caller anchor and never releases by distance', () => {
    const s = state({ mouseClient: { x: 10_000, y: 10_000 } })
    const controller = trap({ state: s })

    controller.engageLive(
      () => ({ x: 300, y: 400 }),
      () => 0
    )
    const composed = controller.composeTarget()

    expect(composed).toBe(true)
    expect(controller.engaged).toBe(true)
    // Strength 0 glues the ring rigidly to the anchor.
    expect(s.target).toEqual({ x: 300, y: 400 })
  })

  /** Taking a live session over a hover engagement has to release the old one
      first, or the follower carries the page-space offset twice. */
  it('releases a prior element engagement before taking over live', () => {
    const s = state({ follower: { x: 10, y: 20 } })
    const controller = trap({
      state: s,
      readScroll: () => {
        s.scroll.x = 5
        s.scroll.y = 100
      }
    })
    controller.engage(el, 1, entry())

    controller.engageLive(
      () => ({ x: 0, y: 0 }),
      () => 0
    )

    expect(s.follower).toEqual({ x: 15, y: 120 })
    expect(controller.engaged).toBe(true)
  })

  /** Defensive: the sessions layer never engages a globally-off trap, but the
      controller still floors the release radius at 0 instead of reading a
      missing radius off `false`. */
  it('floors the release radius at 0 when Magnetic is globally off', () => {
    const s = state({ mouseClient: { x: 150, y: 150 } })
    const controller = trap({ state: s, options: resolveOptions({ magnetic: false }) })

    expect(() => controller.engage(el, 1, entry())).not.toThrow()
    expect(controller.engaged).toBe(true)
  })

  /** A live session takes the slot the same way a neighbouring hover does —
      and `busy` has to keep the motion loop alive until the queue drains, or
      the element freezes mid-return when the follower converges. */
  it('stays busy until an element handed off to a live session finishes returning', () => {
    const { controller } = engagedAt(170, 150)
    controller.composeTarget()
    controller.tick(FRAME_60)

    controller.engageLive(
      () => ({ x: 300, y: 400 }),
      () => 0
    )
    controller.release()

    expect(el.style.translate).not.toBe('')
    expect(controller.busy).toBe(true)

    settle(controller)
    expect(controller.busy).toBe(false)
    expect(el.style.translate).toBe('')
  })

  it('reads the strength again on every frame', () => {
    const s = state({ mouseClient: { x: 320, y: 400 } })
    const controller = trap({ state: s })
    let strength = 0
    controller.engageLive(
      () => ({ x: 300, y: 400 }),
      () => strength
    )

    controller.composeTarget()
    expect(s.target.x).toBe(300)

    strength = 1
    controller.composeTarget()
    expect(s.target.x).toBe(300 + 20 * PULL_FACTOR)
  })
})

describe('dispose', () => {
  it('lets go of the element and the engagement at once', () => {
    const { controller } = engagedAt(170, 150)
    controller.composeTarget()
    controller.tick(FRAME_60)

    controller.dispose()

    expect(controller.engaged).toBe(false)
    expect(controller.busy).toBe(false)
    expect(el.style.translate).toBe('')
  })

  /** Dispose is the one exit that skips release(), so the restore path itself
      must hand the pressed scale back. */
  it('restores a pressed element on dispose', () => {
    const { controller } = engagedAt(150, 150)
    controller.setPressedScale(0.75)

    controller.dispose()

    expect(el.style.scale).toBe('')
  })

  /** Teardown is instant for the returning queue too — nothing may keep easing
      (or keep its inline overrides) after the engine is gone. */
  it('restores a returning element on dispose', () => {
    const { first, second } = twoDots()
    const { controller } = engagedAt(170, 150, { target: first })
    controller.composeTarget()
    controller.tick(FRAME_60)
    controller.engage(second, 1, entry())

    controller.dispose()

    expect(controller.busy).toBe(false)
    expect(first.style.translate).toBe('')
    expect(first.style.transition).toBe('')
    expect(first.style.willChange).toBe('')
  })
})
