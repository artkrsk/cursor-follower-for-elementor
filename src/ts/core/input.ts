import { POINTER_MEDIA_QUERY } from '../constants'
import type { IPointerInput } from '../interfaces'

/**
 * Pointer source. A `(hover:hover) and (pointer:fine)` media query owns the
 * listener lifecycle, so hybrid devices attach/detach correctly at runtime.
 * Touch input never reaches the engine (pointerType gate).
 */

/** The engine's pointer-type gate — shared with interaction/targets.ts so
    hover tracking obeys the same rule as the listeners here. */
export const accepts = (e: PointerEvent) => e.pointerType === 'mouse' || e.pointerType === 'pen'

export function createPointerInput(args: {
  signal: AbortSignal
  onMove: (e: PointerEvent) => void
  onDown: (e: PointerEvent) => void
  onUp: (e: PointerEvent) => void
  onEnabledChange: (enabled: boolean) => void
}): IPointerInput {
  const mql = window.matchMedia(POINTER_MEDIA_QUERY)
  let listeners: AbortController | null = null

  const attach = () => {
    if (listeners) {
      return
    }
    listeners = new AbortController()
    const opts = { passive: true, signal: listeners.signal }
    window.addEventListener('pointermove', (e) => accepts(e) && args.onMove(e), opts)
    // pointerover is a position source too: it fires with coordinates on page
    // entry, and — in Chromium and Safari (w3c/pointerevents#529; Firefox
    // sends just mouseover) — on hover recomputation under a resting
    // pointer: after load, or when content scrolls beneath it. Earliest
    // possible reveal where it fires.
    window.addEventListener('pointerover', (e) => accepts(e) && args.onMove(e), opts)
    window.addEventListener('pointerdown', (e) => accepts(e) && args.onDown(e), opts)
    window.addEventListener('pointerup', (e) => accepts(e) && args.onUp(e), opts)
    // A cancelled pointer (rare on mouse) ends the press and any active drag.
    window.addEventListener('pointercancel', (e) => accepts(e) && args.onUp(e), opts)
  }

  const detach = () => {
    listeners?.abort()
    listeners = null
  }

  const apply = (enabled: boolean, notify: boolean) => {
    if (enabled) {
      attach()
    } else {
      detach()
    }
    if (notify) {
      args.onEnabledChange(enabled)
    }
  }

  mql.addEventListener('change', (e) => apply(e.matches, true), { signal: args.signal })
  args.signal.addEventListener('abort', detach)
  apply(mql.matches, false)

  return {
    get enabled() {
      return listeners !== null
    }
  }
}
