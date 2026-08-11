// @vitest-environment happy-dom

import { createFrameState, createScrollReader } from '@ts/core/frameState'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeFrameState, setScroll } from '../support'

/**
 * The scroll seam. `window` is the only source; createScrollReader samples it on
 * a passive listener so the frame path reads the plain `state.scroll` field with
 * no layout-flushing `window.scrollX` on it. Needs a DOM only for `window` and
 * its events — the vectors themselves are plain numbers.
 */

const setViewport = (w: number, h: number) => {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}

beforeEach(() => {
  setViewport(1024, 768)
  setScroll(0, 0)
})

afterEach(() => {
  setScroll(0, 0)
})

describe('createFrameState', () => {
  it('centres on the viewport and seeds page-space vectors from scroll', () => {
    setViewport(1000, 600)
    setScroll(0, 200)

    const state = createFrameState()

    expect(state.mouseClient).toEqual({ x: 500, y: 300 })
    expect(state.scroll).toEqual({ x: 0, y: 200 })
    // target/follower are page-space: viewport centre + scroll.
    expect(state.target).toEqual({ x: 500, y: 500 })
    expect(state.follower).toEqual({ x: 500, y: 500 })
    expect(state.lag).toEqual({ x: 0, y: 0 })
    expect(state.pointerSeen).toBe(false)
  })
})

describe('createScrollReader', () => {
  it('seeds state.scroll from the window at construction', () => {
    setScroll(10, 20)
    const state = makeFrameState()

    createScrollReader(state, new AbortController().signal)

    expect(state.scroll).toEqual({ x: 10, y: 20 })
  })

  it('updates state.scroll on a scroll event', () => {
    const state = makeFrameState()
    createScrollReader(state, new AbortController().signal)

    setScroll(5, 60)
    window.dispatchEvent(new Event('scroll'))

    expect(state.scroll).toEqual({ x: 5, y: 60 })
  })

  it('stops updating once the signal aborts', () => {
    const state = makeFrameState()
    const controller = new AbortController()
    createScrollReader(state, controller.signal)

    controller.abort()
    setScroll(9, 9)
    window.dispatchEvent(new Event('scroll'))

    expect(state.scroll).toEqual({ x: 0, y: 0 })
  })

  /** The returned sampler is the authoritative re-sync called at engage and snap,
      independent of any scroll event. */
  it('returns a sampler that re-syncs on demand', () => {
    const state = makeFrameState()
    const sync = createScrollReader(state, new AbortController().signal)

    setScroll(3, 7) // no event dispatched
    expect(state.scroll).toEqual({ x: 0, y: 0 })

    sync()

    expect(state.scroll).toEqual({ x: 3, y: 7 })
  })
})
