import { GEOMETRY_TASK_BUDGET_MS, IDLE_FALLBACK_MS, RESIZE_DEBOUNCE_MS } from '../constants'
import type { IGeometryCache, IGeometryEntry } from '../interfaces'

/**
 * Page-space element geometry, kept fresh without layout flushes on any
 * interaction path:
 * - pre-warmed through bounded, coalesced observer registration at idle (no rect reads)
 * - revalidated through a shared IntersectionObserver (its boundingClientRect is
 *   served from already-computed geometry — flush-free): the resize sweep pushes
 *   through it, and stream() re-observes for a continuous feed while an anchor is
 *   engaged
 * - sizes maintained by a shared ResizeObserver, which revalidates the same way
 * - page-space coordinates are scroll-invariant for elements in normal flow,
 *   so scrolling never stales them; a fixed or stuck-sticky element's page
 *   coordinates DO move with scroll, which is why engage-time consumers call
 *   measure() instead of trusting resolve()'s cache, and stream while engaged
 * - detached elements are evicted when seen: an IO record that comes back
 *   detached drops the entry, and warm() (the post-navigation hint) and resize
 *   both sweep the tracked set. `tracked` is the only durable strong reference to page
 *   elements the engine holds — the observers hold their targets weakly — so a
 *   long-lived engine surviving SPA navigations doesn't retain dead DOM trees
 *
 * Entries are stable per-element objects mutated in place, so a holder of a
 * reference sees updates without re-resolving — which is what lets an engaged
 * magnetic anchor read its live entry every frame.
 */

/**
 * Page-space entry write — mutates the stable object in place when there is
 * one, so existing holders see the update. The scroll offset is a parameter
 * because it must come from the same snapshot as `rect`: a rect already
 * reflects the applied scroll, so pairing it with anything else (a smooth
 * scroller's animated position, a value cached a frame ago) yields a page
 * coordinate that is wrong by the difference.
 */
export const writeEntry = (
  entries: WeakMap<Element, IGeometryEntry>,
  el: Element,
  rect: DOMRectReadOnly,
  scrollX: number,
  scrollY: number
): IGeometryEntry => {
  const pageX = rect.left + scrollX
  const pageY = rect.top + scrollY
  let entry = entries.get(el)
  if (entry) {
    entry.pageX = pageX
    entry.pageY = pageY
    entry.w = rect.width
    entry.h = rect.height
  } else {
    entry = { pageX, pageY, w: rect.width, h: rect.height }
    entries.set(el, entry)
  }
  return entry
}

export function createGeometryCache(): IGeometryCache {
  const entries = new WeakMap<Element, IGeometryEntry>()
  const tracked = new Set<Element>()
  let disposed = false
  const pending = new Set<Element>()
  let scheduled = false
  let cancelTask: (() => void) | null = null

  const resizeObserver = new ResizeObserver((observed) => {
    for (const { target } of observed) {
      // Size changed — position may have shifted too; refresh flush-free.
      revalidate(target)
    }
  })

  const track = (el: Element) => {
    if (!tracked.has(el)) {
      tracked.add(el)
      resizeObserver.observe(el)
    }
  }

  const untrack = (el: Element) => {
    tracked.delete(el)
    pending.delete(el)
    streaming.delete(el)
    entries.delete(el)
    io.unobserve(el)
    resizeObserver.unobserve(el)
  }

  const streaming = new Set<Element>()

  // One persistent observer for every revalidation: observe() delivers a fresh
  // record, then the element is unobserved until the next request — unless it
  // is being streamed, in which case it re-observes for a continuous feed. A
  // streamed anchor therefore re-delivers ~once per frame, and each delivery
  // allocates a records array and a DOMRectReadOnly — the one exception to the
  // frame path's allocation-free rule, and the only flush-free way to keep a
  // moving anchor's geometry live.
  const io = new IntersectionObserver((records) => {
    if (disposed) return
    for (const { target, boundingClientRect } of records) {
      io.unobserve(target)
      if (target.isConnected) {
        writeEntry(entries, target, boundingClientRect, window.scrollX, window.scrollY)
        if (streaming.has(target)) {
          io.observe(target)
        }
      } else {
        // Detached (SPA navigation) — its record is all zeros; evict instead.
        streaming.delete(target)
        untrack(target)
      }
    }
  })

  const revalidate = (el: Element) => {
    if (!disposed) {
      io.observe(el)
    }
  }

  // Register with IO in small tasks. Warming must never synchronously measure
  // an entire page while the browser is rendering a navigation or cursor return.
  const drain = () => {
    scheduled = false
    cancelTask = null
    if (disposed) return
    const start = performance.now()
    for (const el of pending) {
      pending.delete(el)
      if (el.isConnected) {
        track(el)
        revalidate(el)
      } else {
        untrack(el)
      }
      if (performance.now() - start >= GEOMETRY_TASK_BUDGET_MS) break
    }
    if (pending.size) schedule()
  }
  const schedule = () => {
    if (scheduled || disposed) return
    scheduled = true
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(drain, { timeout: IDLE_FALLBACK_MS })
      cancelTask = () => cancelIdleCallback(id)
    } else {
      const id = setTimeout(drain, IDLE_FALLBACK_MS)
      cancelTask = () => clearTimeout(id)
    }
  }

  const refreshTracked = () => {
    for (const el of tracked) pending.add(el)
    if (pending.size) schedule()
  }

  let resizeTimer = 0
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(refreshTracked, RESIZE_DEBOUNCE_MS)
  }
  window.addEventListener('resize', onResize, { passive: true })

  /** One synchronous read — resolve()'s cold path and the engage-time escape
      hatch for elements whose cached page coordinates scroll carried away. */
  const measure = (el: Element) => {
    const entry = writeEntry(
      entries,
      el,
      el.getBoundingClientRect(),
      window.scrollX,
      window.scrollY
    )
    track(el)
    return entry
  }

  return {
    resolve(el) {
      // Cold element (added after warm): one synchronous read, then tracked.
      return entries.get(el) ?? measure(el)
    },
    measure,
    stream(el) {
      if (disposed) {
        return () => {}
      }
      streaming.add(el)
      track(el)
      io.observe(el)
      return () => {
        streaming.delete(el)
      }
    },
    warm(els) {
      if (disposed) return
      // Empty hints still sweep detached trees after SPA navigation.
      for (const el of tracked) {
        if (!el.isConnected) pending.add(el)
      }
      for (const el of els) pending.add(el)
      if (pending.size) schedule()
    },
    dispose() {
      disposed = true
      clearTimeout(resizeTimer)
      cancelTask?.()
      cancelTask = null
      pending.clear()
      io.disconnect()
      resizeObserver.disconnect()
      tracked.clear()
      streaming.clear()
      window.removeEventListener('resize', onResize)
    }
  }
}
