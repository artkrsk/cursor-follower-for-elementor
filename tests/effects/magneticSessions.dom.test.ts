// @vitest-environment happy-dom

import { MAGNETIC_ATTR } from '@ts/constants'
import { resolveOptions } from '@ts/core/options'
import { createMagneticSessions } from '@ts/effects/magneticSessions'
import type {
  IEffectsSuite,
  IGeometryCache,
  IGeometryEntry,
  IResolvedOptions
} from '@ts/interfaces'
import type { TStyledElement } from '@ts/types'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { makeFrameState } from '../support'

/**
 * Who owns the trap. A programmatic magnetize() session outranks hover: while
 * one is held, enter/leave must not touch the trap, and only its owner ends it.
 * The trap's own maths lives in magnetic.dom.test.ts.
 */

/** Trap tests presume a pointer that has been seen. */
const state = () => makeFrameState({ pointerSeen: true })

const entry: IGeometryEntry = { pageX: 100, pageY: 100, w: 100, h: 100 }

let root: HTMLElement
let el: TStyledElement
let stopStream: Mock<() => void>
let geometry: IGeometryCache
let suite: IEffectsSuite
let wake: Mock<() => void>

const build = (options: IResolvedOptions = resolveOptions()) =>
  createMagneticSessions({
    root,
    state: state(),
    geometry,
    options,
    suite,
    readScroll: () => {},
    wake
  })

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div><div id="target"></div>'
  root = document.getElementById('root') as HTMLElement
  el = document.getElementById('target') as unknown as TStyledElement
  stopStream = vi.fn()
  geometry = {
    resolve: vi.fn(() => entry),
    stream: vi.fn(() => stopStream)
  } as unknown as IGeometryCache
  suite = { addSession: vi.fn(() => vi.fn()) } as unknown as IEffectsSuite
  wake = vi.fn()
})

describe('engageHover', () => {
  it('engages the trap, flags the root and wakes the loop', () => {
    const sessions = build()

    sessions.engageHover(el, { magnetic: true }, el)

    expect(sessions.controller.engaged).toBe(true)
    expect(root.hasAttribute(MAGNETIC_ATTR)).toBe(true)
    expect(wake).toHaveBeenCalled()
  })

  /** Streaming keeps the anchor centred while an entrance animation is still
      moving the element, instead of freezing a stale snapshot. */
  it('streams the anchor geometry for as long as it is engaged', () => {
    const sessions = build()

    sessions.engageHover(el, { magnetic: true }, el)

    expect(geometry.stream).toHaveBeenCalledWith(el)
  })

  it('stops the previous stream when hover moves to another element', () => {
    const sessions = build()
    sessions.engageHover(el, { magnetic: true }, el)

    sessions.engageHover(el, { magnetic: true }, el)

    expect(stopStream).toHaveBeenCalledOnce()
  })

  /** The trigger's rect is the zone the trap holds inside — the
      hover boundary owns release there, so the trap must know its bounds. */
  it('resolves the trigger zone and hands its rect to the trap', () => {
    const zoneEl = document.createElement('div')
    const zoneEntry: IGeometryEntry = { pageX: 0, pageY: 0, w: 800, h: 100 }
    geometry = {
      resolve: vi.fn((target: Element) => (target === zoneEl ? zoneEntry : entry)),
      stream: vi.fn(() => stopStream)
    } as unknown as IGeometryCache
    const sessions = build()
    const engage = vi.spyOn(sessions.controller, 'engage')

    sessions.engageHover(el, { magnetic: true }, zoneEl)

    expect(engage).toHaveBeenCalledWith(el, expect.any(Number), entry, zoneEntry)
  })

  it('does nothing at all while Magnetic is switched off globally', () => {
    const sessions = build(resolveOptions({ magnetic: false }))

    sessions.engageHover(el, { magnetic: true }, el)

    expect(sessions.controller.engaged).toBe(false)
    expect(root.hasAttribute(MAGNETIC_ATTR)).toBe(false)
  })

  it('takes a numeric payload strength over the configured default', () => {
    const sessions = build()
    const engage = vi.spyOn(sessions.controller, 'engage')

    sessions.engageHover(el, { magnetic: 0.9 }, el)

    expect(engage).toHaveBeenCalledWith(el, 0.9, entry, entry)
  })

  it('falls back to the configured strength for a bare `magnetic: true`', () => {
    const options = resolveOptions()
    const sessions = build(options)
    const engage = vi.spyOn(sessions.controller, 'engage')

    sessions.engageHover(el, { magnetic: true }, el)

    const strength = options.magnetic === false ? null : options.magnetic.strength
    expect(engage).toHaveBeenCalledWith(el, strength, entry, entry)
  })
})

describe('releaseHover', () => {
  it('releases the trap and clears the flag', () => {
    const sessions = build()
    sessions.engageHover(el, { magnetic: true }, el)

    sessions.releaseHover()

    expect(sessions.controller.engaged).toBe(false)
    expect(root.hasAttribute(MAGNETIC_ATTR)).toBe(false)
    expect(stopStream).toHaveBeenCalled()
  })

  it('is a no-op when nothing is engaged', () => {
    const sessions = build()

    sessions.releaseHover()

    expect(wake).not.toHaveBeenCalled()
  })
})

describe('magnetize', () => {
  const anchor = () => ({ x: 300, y: 400 })

  it('engages a live trap and flags the root', () => {
    const sessions = build()

    sessions.magnetize({ getAnchor: anchor })

    expect(sessions.controller.engaged).toBe(true)
    expect(root.hasAttribute(MAGNETIC_ATTR)).toBe(true)
  })

  it('takes over from a hover engagement', () => {
    const sessions = build()
    sessions.engageHover(el, { magnetic: true }, el)

    sessions.magnetize({ getAnchor: anchor })

    expect(sessions.controller.engaged).toBe(true)
  })

  /** The whole point of the precedence: hover must not steal a live session. */
  it('locks hover out for as long as the session is held', () => {
    const sessions = build()
    const session = sessions.magnetize({ getAnchor: anchor })

    sessions.engageHover(el, { magnetic: true }, el)
    expect(geometry.stream).not.toHaveBeenCalled()

    sessions.releaseHover()
    expect(sessions.controller.engaged).toBe(true)

    session.release()
    expect(sessions.controller.engaged).toBe(false)
  })

  it('holds a payload for the session and releases it with it', () => {
    const releasePayload = vi.fn()
    suite = { addSession: vi.fn(() => releasePayload) } as unknown as IEffectsSuite
    const sessions = build()

    const session = sessions.magnetize({ getAnchor: anchor, payload: { label: 'Drag' } })
    expect(suite.addSession).toHaveBeenCalledWith({ label: 'Drag' })

    session.release()
    expect(releasePayload).toHaveBeenCalledOnce()
  })

  it('ignores a session released twice', () => {
    const sessions = build()
    const session = sessions.magnetize({ getAnchor: anchor })

    session.release()
    const wakes = wake.mock.calls.length
    session.release()

    expect(wake.mock.calls).toHaveLength(wakes)
  })

  it('returns an inert session while Magnetic is switched off', () => {
    const sessions = build(resolveOptions({ magnetic: false }))

    const session = sessions.magnetize({ getAnchor: anchor })

    expect(sessions.controller.engaged).toBe(false)
    expect(() => session.release()).not.toThrow()
  })
})

/**
 * The strength getter magnetize() hands the controller: read once per frame, so
 * a function form can dial live and either form falls back to the configured
 * default on a null/absent value.
 */
describe('magnetize — strength resolution', () => {
  const anchor = () => ({ x: 0, y: 0 })

  it('resolves a function strength per call and falls back to the default', () => {
    const options = resolveOptions()
    const sessions = build(options)
    const engageLive = vi.spyOn(sessions.controller, 'engageLive')
    let dialed: number | null = 0.3

    sessions.magnetize({ getAnchor: anchor, strength: () => dialed })

    const readStrength = engageLive.mock.calls[0]?.[1]
    const dflt = options.magnetic === false ? 0 : options.magnetic.strength
    expect(readStrength?.()).toBe(0.3)
    dialed = null
    expect(readStrength?.()).toBe(dflt)
  })

  it('resolves a fixed numeric strength and falls back when none is given', () => {
    const options = resolveOptions()
    const withNumber = build(options)
    const numberSpy = vi.spyOn(withNumber.controller, 'engageLive')
    withNumber.magnetize({ getAnchor: anchor, strength: 0.7 })
    expect(numberSpy.mock.calls[0]?.[1]?.()).toBe(0.7)

    const withNone = build(options)
    const noneSpy = vi.spyOn(withNone.controller, 'engageLive')
    withNone.magnetize({ getAnchor: anchor })
    const dflt = options.magnetic === false ? 0 : options.magnetic.strength
    expect(noneSpy.mock.calls[0]?.[1]?.()).toBe(dflt)
  })
})

describe('trailingOverride', () => {
  it('is null with no live session in play', () => {
    const sessions = build()

    expect(sessions.trailingOverride()).toBeNull()
  })

  /** Read per frame, so a caller can dial it while dragging. */
  it('reports the live session value and drops it on release', () => {
    const sessions = build()
    let trailing = 1

    const session = sessions.magnetize({
      getAnchor: () => ({ x: 0, y: 0 }),
      trailing: () => trailing
    })
    expect(sessions.trailingOverride()).toBe(1)

    trailing = 0.5
    expect(sessions.trailingOverride()).toBe(0.5)

    session.release()
    expect(sessions.trailingOverride()).toBeNull()
  })
})

describe('dispose', () => {
  it('drops the live session, the stream and the trap together', () => {
    const sessions = build()
    sessions.engageHover(el, { magnetic: true }, el)

    sessions.dispose()

    expect(stopStream).toHaveBeenCalled()
    expect(sessions.controller.engaged).toBe(false)
    expect(sessions.trailingOverride()).toBeNull()
  })
})
