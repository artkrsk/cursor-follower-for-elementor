import type { ITickerAdapter } from '../interfaces'
import type { TTickerCallback } from '../types'

/**
 * Internal rAF ticker with the tempus-compatible callback shape.
 * The loop only runs while subscribers exist — zero cost when the engine idles.
 */
export function createInternalTicker(): ITickerAdapter {
  const subscribers = new Set<TTickerCallback>()
  let raf = 0
  let running = false
  let scheduled = false
  let epoch = 0
  let last = 0
  let frame = 0

  /** Single-armed rAF: a synchronous sleep→wake inside a tick would otherwise
      schedule twice (from the wake and from the tick tail) — two ticks/frame. */
  const schedule = () => {
    if (scheduled || subscribers.size === 0) {
      return
    }
    scheduled = true
    raf = requestAnimationFrame(tick)
  }

  const tick = (now: number) => {
    scheduled = false
    const delta = now - last
    last = now
    frame++
    // Direct Set iteration — no per-frame defensive copy; Set semantics make
    // delete-during-iteration safe (already-visited or skipped, never stale).
    for (const cb of subscribers) {
      cb(now - epoch, delta, frame)
    }
    if (subscribers.size > 0) {
      schedule()
    } else {
      running = false
    }
  }

  return {
    subscribe(cb) {
      subscribers.add(cb)
      if (!running) {
        running = true
        last = performance.now()
        if (epoch === 0) {
          epoch = last
        }
      }
      schedule()
      return () => {
        subscribers.delete(cb)
        if (subscribers.size === 0 && running) {
          cancelAnimationFrame(raf)
          running = false
          scheduled = false
        }
      }
    }
  }
}
