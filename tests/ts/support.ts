import { FRAME_60 } from '@ts/constants'
import type { IFrameState, ITickerAdapter } from '@ts/interfaces'
import type { TTickerCallback } from '@ts/types'
import { vi } from 'vitest'

/**
 * Shared mechanical fakes for the test suites — the pieces that were hand-copied
 * across files and carry no per-test meaning. The make/fake verbs are the
 * test-side convention on purpose; create is reserved for engine factories.
 * Everything here is a FACTORY that
 * builds fresh objects per call: the frame path mutates vectors in place, so a
 * shared literal would leak state across tests (the rule the fixtures encode).
 * The filename deliberately does not end in `.test.ts`, so Vitest never
 * collects it as a suite; coverage never sees it since it only instruments
 * `src/ts`.
 */

/** A fresh IFrameState. Every vector is built per call — even a caller-passed
    override is spread into a new object, never aliased in. */
export const makeFrameState = (over: Partial<IFrameState> = {}): IFrameState => ({
  mouseClient: { x: 0, y: 0, ...over.mouseClient },
  scroll: { x: 0, y: 0, ...over.scroll },
  target: { x: 0, y: 0, ...over.target },
  follower: { x: 0, y: 0, ...over.follower },
  lag: { x: 0, y: 0, ...over.lag },
  pointerSeen: over.pointerSeen ?? false
})

/**
 * Stub matchMedia with a single controllable MediaQueryList. `flip(next)` sets
 * `matches` and fires every registered listener in one step — the shape the
 * engine's `(hover:hover) and (pointer:fine)` gate needs for hybrid
 * attach/detach tests. Relies on the config's `unstubGlobals: true` to restore
 * the real matchMedia between tests.
 */
export const fakeMedia = (matches: boolean) => {
  const listeners = new Set<(e: { matches: boolean }) => void>()
  const mql = {
    matches,
    addEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: (e: { matches: boolean }) => void) =>
      listeners.delete(cb)
  }
  vi.stubGlobal('matchMedia', () => mql)
  return {
    flip(next: boolean) {
      mql.matches = next
      for (const cb of [...listeners]) {
        cb({ matches: next })
      }
    }
  }
}

/** A hand-stepped ticker: `step()` runs every subscriber one frame, so no test
    depends on a real rAF ever firing. */
export const fakeTicker = () => {
  const subscribers = new Set<TTickerCallback>()
  return {
    adapter: {
      subscribe(cb: TTickerCallback) {
        subscribers.add(cb)
        return () => subscribers.delete(cb)
      }
    } satisfies ITickerAdapter,
    step(dt = FRAME_60) {
      for (const cb of subscribers) {
        cb(0, dt, 1)
      }
    },
    get subscribed() {
      return subscribers.size > 0
    },
    get count() {
      return subscribers.size
    }
  }
}

/** querySelector that throws instead of returning null — a missing fixture
    should fail the test naming it, not surface as a null deref later. */
export const at = (selector: string): Element => {
  const el = document.querySelector(selector)
  if (!el) {
    throw new Error(`fixture is missing ${selector}`)
  }
  return el
}

/** Mock the window scroll offset (happy-dom's is read-only). */
export const setScroll = (x: number, y: number): void => {
  Object.defineProperty(window, 'scrollX', { value: x, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
}
