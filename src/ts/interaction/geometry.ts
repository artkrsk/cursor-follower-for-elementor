import { IDLE_FALLBACK_MS, RESIZE_DEBOUNCE_MS } from '../constants'
import type { IGeometryCache, IGeometryEntry } from '../interfaces'

/**
 * Page-space element geometry, kept fresh without layout flushes on any
 * interaction path:
 * - pre-warmed in one batched pass at idle (single flush, clean tree)
 * - revalidated per hover via a shared IntersectionObserver (its
 *   boundingClientRect is served from already-computed geometry — flush-free)
 * - sizes maintained by a shared ResizeObserver
 * - page-space coordinates are scroll-invariant, so scrolling never stales them
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

const idle =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, IDLE_FALLBACK_MS)

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

  const refreshTracked = () => {
    // Viewport change invalidates everything; re-measure the tracked set lazily.
    for (const el of tracked) {
      if (el.isConnected) {
        revalidate(el)
      } else {
        untrack(el)
      }
    }
  }

  let resizeTimer = 0
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(refreshTracked, RESIZE_DEBOUNCE_MS)
  }
  window.addEventListener('resize', onResize, { passive: true })

  return {
    resolve(el) {
      const cached = entries.get(el)
      if (cached) {
        return cached
      }
      // Cold element (added after warm): one synchronous read, then tracked.
      const entry = writeEntry(
        entries,
        el,
        el.getBoundingClientRect(),
        window.scrollX,
        window.scrollY
      )
      track(el)
      return entry
    },
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
      const list = [...els]
      if (list.length === 0) {
        return
      }
      idle(() => {
        if (disposed) {
          return
        }
        // Post-navigation sweep: warm() is the documented hint after injecting
        // DOM, so it's also where detached tracked elements are evicted (deleting
        // the current element mid-iteration is safe over a Set).
        for (const el of tracked) {
          if (!el.isConnected) {
            untrack(el)
          }
        }
        // One batched pass — a single flush at idle on a clean tree, and one
        // scroll snapshot shared by the whole batch.
        const scrollX = window.scrollX
        const scrollY = window.scrollY
        for (const el of list) {
          writeEntry(entries, el, el.getBoundingClientRect(), scrollX, scrollY)
          track(el)
        }
      })
    },
    dispose() {
      disposed = true
      clearTimeout(resizeTimer)
      io.disconnect()
      resizeObserver.disconnect()
      tracked.clear()
      streaming.clear()
      window.removeEventListener('resize', onResize)
    }
  }
}
