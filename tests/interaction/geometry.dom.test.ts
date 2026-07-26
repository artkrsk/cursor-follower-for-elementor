// @vitest-environment happy-dom

import { IDLE_FALLBACK_MS, RESIZE_DEBOUNCE_MS } from '@ts/constants'
import { createGeometryCache } from '@ts/interaction/geometry'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setScroll } from '../support'

/**
 * The factory half — the pure `writeEntry` lives in geometry.test.ts under node.
 *
 * Both observers are constructed by the factory rather than injected, which is
 * exactly what makes this testable: a stubbed constructor captures the callback,
 * so records are delivered synchronously and eviction, streaming re-observe and
 * the resize debounce become assertable. happy-dom has no requestIdleCallback,
 * so `warm` takes the setTimeout fallback and fake timers drive it.
 */

const rect = (over: Partial<DOMRect> = {}) =>
  ({ left: 0, top: 0, width: 0, height: 0, ...over }) as DOMRect

/** Captures the callback and records every call, so a test can both drive
    records in and assert what the cache asked the observer to do. */
const observerSpy = () => {
  const spy = {
    deliver: (_records: unknown[]): void => {
      throw new Error('observer was never constructed')
    },
    observed: [] as Element[],
    unobserved: [] as Element[],
    disconnected: 0
  }
  class Fake {
    constructor(cb: (records: unknown[]) => void) {
      spy.deliver = cb
    }
    observe(el: Element) {
      spy.observed.push(el)
    }
    unobserve(el: Element) {
      spy.unobserved.push(el)
    }
    disconnect() {
      spy.disconnected++
    }
  }
  return { spy, Fake }
}

const elementAt = (over: Partial<DOMRect> = {}) => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(over))
  return el
}

let io: ReturnType<typeof observerSpy>['spy']
let ro: ReturnType<typeof observerSpy>['spy']
let cache: ReturnType<typeof createGeometryCache>

beforeEach(() => {
  document.body.innerHTML = ''
  setScroll(0, 0)
  const intersection = observerSpy()
  const resize = observerSpy()
  io = intersection.spy
  ro = resize.spy
  vi.stubGlobal('IntersectionObserver', intersection.Fake)
  vi.stubGlobal('ResizeObserver', resize.Fake)
  cache = createGeometryCache()
})

afterEach(() => {
  cache.dispose()
  vi.useRealTimers()
})

describe('resolve', () => {
  it('reads a cold element once and tracks it for size changes', () => {
    setScroll(5, 7)
    const el = elementAt({ left: 10, top: 20, width: 100, height: 50 })

    const entry = cache.resolve(el)

    expect(entry).toEqual({ pageX: 15, pageY: 27, w: 100, h: 50 })
    expect(el.getBoundingClientRect).toHaveBeenCalledOnce()
    expect(ro.observed).toEqual([el])
  })

  /** The hot path on every hover: a cached entry must not cost a layout flush. */
  it('serves a cached entry without reading layout again', () => {
    const el = elementAt({ left: 10, top: 20 })
    const first = cache.resolve(el)

    const second = cache.resolve(el)

    expect(second).toBe(first)
    expect(el.getBoundingClientRect).toHaveBeenCalledOnce()
  })

  /** Hovering an element and then magnetically streaming it are two independent
      reasons to track it — the element must still be observed exactly once. */
  it('tracks an element once however many callers ask for it', () => {
    const el = elementAt()

    cache.resolve(el)
    cache.stream(el)

    expect(ro.observed).toEqual([el])
  })
})

describe('revalidation through the intersection observer', () => {
  /** The flush-free refresh: the record's boundingClientRect is served from
      geometry the browser already computed, so no layout is forced. */
  it('writes page space from the record and the scroll it was read with', () => {
    setScroll(0, 200)
    const el = elementAt()
    const entry = cache.resolve(el)

    io.deliver([
      { target: el, boundingClientRect: rect({ left: 30, top: 40, width: 8, height: 9 }) }
    ])

    expect(entry).toEqual({ pageX: 30, pageY: 240, w: 8, h: 9 })
  })

  it('stops observing as soon as the record arrives', () => {
    const el = elementAt()
    cache.stream(el)()

    io.deliver([{ target: el, boundingClientRect: rect() }])

    expect(io.unobserved).toEqual([el])
  })

  /** SPA navigation: a detached element's record is all zeros, so writing it
      would poison the entry. It is evicted instead, and the engine stops
      retaining the dead tree. */
  it('evicts a detached element instead of writing its zeroed record', () => {
    const el = elementAt({ left: 10, top: 20, width: 100, height: 50 })
    const entry = cache.resolve(el)
    el.remove()

    io.deliver([{ target: el, boundingClientRect: rect() }])

    expect(entry).toEqual({ pageX: 10, pageY: 20, w: 100, h: 50 })
    expect(ro.unobserved).toEqual([el])
  })

  it('ignores in-flight records after dispose', () => {
    const el = elementAt()
    cache.resolve(el)
    cache.dispose()
    const before = io.observed.length

    ro.deliver([{ target: el }])

    expect(io.observed).toHaveLength(before)
  })
})

describe('streaming', () => {
  it('re-observes after every record so the feed continues', () => {
    const el = elementAt()
    cache.stream(el)

    io.deliver([{ target: el, boundingClientRect: rect() }])
    io.deliver([{ target: el, boundingClientRect: rect() }])

    expect(io.observed).toEqual([el, el, el])
  })

  it('stops re-observing once the stream is released', () => {
    const el = elementAt()
    const stop = cache.stream(el)

    stop()
    io.deliver([{ target: el, boundingClientRect: rect() }])

    expect(io.observed).toEqual([el])
  })

  it('drops a detached element out of the stream', () => {
    const el = elementAt()
    cache.stream(el)
    el.remove()

    io.deliver([{ target: el, boundingClientRect: rect() }])

    expect(io.observed).toEqual([el])
    expect(ro.unobserved).toEqual([el])
  })

  it('hands back a no-op release after dispose', () => {
    const el = elementAt()
    cache.dispose()

    const stop = cache.stream(el)

    expect(io.observed).toHaveLength(0)
    expect(() => stop()).not.toThrow()
  })
})

describe('the resize observer', () => {
  /** A size change can move the element too, so it is a position invalidation
      as much as a size one. */
  it('revalidates an element whose box changed', () => {
    const el = elementAt()
    cache.resolve(el)

    ro.deliver([{ target: el }])

    expect(io.observed).toEqual([el])
  })
})

describe('the window resize debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('collapses a burst of resizes into one refresh', () => {
    const el = elementAt()
    cache.resolve(el)

    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS)

    expect(io.observed).toEqual([el])
  })

  it('holds off until the burst has settled', () => {
    const el = elementAt()
    cache.resolve(el)

    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS - 1)

    expect(io.observed).toHaveLength(0)
  })

  it('drops elements that left the document instead of revalidating them', () => {
    const live = elementAt()
    const gone = elementAt()
    cache.resolve(live)
    cache.resolve(gone)
    gone.remove()

    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS)

    expect(io.observed).toEqual([live])
    expect(ro.unobserved).toEqual([gone])
  })

  it('cancels a pending refresh on dispose', () => {
    const el = elementAt()
    cache.resolve(el)

    window.dispatchEvent(new Event('resize'))
    cache.dispose()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS)

    expect(io.observed).toHaveLength(0)
  })
})

describe('warm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('measures the batch at idle against one shared scroll snapshot', () => {
    setScroll(0, 100)
    const a = elementAt({ left: 10, top: 20 })
    const b = elementAt({ left: 30, top: 40 })

    cache.warm([a, b])
    vi.advanceTimersByTime(IDLE_FALLBACK_MS)

    expect(cache.resolve(a)).toEqual({ pageX: 10, pageY: 120, w: 0, h: 0 })
    expect(cache.resolve(b)).toEqual({ pageX: 30, pageY: 140, w: 0, h: 0 })
    expect(ro.observed).toEqual([a, b])
  })

  it('does nothing at all for an empty batch', () => {
    cache.warm([])
    vi.advanceTimersByTime(IDLE_FALLBACK_MS)

    expect(ro.observed).toHaveLength(0)
  })

  it('abandons a batch that was still pending at dispose', () => {
    const el = elementAt()

    cache.warm([el])
    cache.dispose()
    vi.advanceTimersByTime(IDLE_FALLBACK_MS)

    expect(ro.observed).toHaveLength(0)
  })

  /** The sweep's other half: an element still in the document stays tracked. */
  it('keeps a connected tracked element through the sweep', () => {
    const el = elementAt()
    cache.resolve(el) // tracked, and connected — elementAt appends to body

    cache.warm([elementAt()])
    vi.advanceTimersByTime(IDLE_FALLBACK_MS)

    expect(ro.unobserved).not.toContain(el)
  })

  /** The module-load ternary: with requestIdleCallback present (every Chromium
      and Firefox) the batch rides it instead of the setTimeout fallback. A fresh
      import is the only way to re-evaluate the pick. */
  it('goes through requestIdleCallback when the platform has one', async () => {
    const ric = vi.fn((cb: () => void) => cb())
    vi.stubGlobal('requestIdleCallback', ric)
    vi.resetModules()
    const { createGeometryCache: fresh } = await import('@ts/interaction/geometry')

    const idleCache = fresh()
    const el = elementAt({ left: 3, top: 4 })
    idleCache.warm([el])

    expect(ric).toHaveBeenCalledOnce()
    expect(idleCache.resolve(el)).toEqual({ pageX: 3, pageY: 4, w: 0, h: 0 })
    idleCache.dispose()
  })

  /** The post-navigation sweep: warm evicts tracked elements that detached (SPA
      nav) before measuring the new batch, so the tracked set doesn't retain dead
      trees. */
  it('evicts a detached tracked element and keeps the connected one', () => {
    const gone = elementAt()
    cache.resolve(gone) // cold resolve tracks it
    gone.remove() // detached — isConnected is now false
    const keep = elementAt()

    cache.warm([keep])
    vi.advanceTimersByTime(IDLE_FALLBACK_MS)

    expect(ro.unobserved).toContain(gone)
    expect(ro.unobserved).not.toContain(keep)
    expect(ro.observed).toContain(keep)
  })
})

describe('dispose', () => {
  it('disconnects both observers', () => {
    cache.dispose()

    expect(io.disconnected).toBe(1)
    expect(ro.disconnected).toBe(1)
  })
})
