/**
 * Inline pre-paint gate — printed into `wp_head` by PHP, never enqueued.
 * Owns the parse-time discovery global and the <html> class prediction on
 * every device; fetches the stylesheet + engine only on the first real
 * pointer signal, or on a live media-query flip to matching, so a touch
 * device downloads nothing. The engine corrects the prediction at init and
 * owns capability transitions after load (core/input.ts).
 */

import {
  GATE_CSS_ID,
  GATE_JS_ID,
  HTML_ACTIVE,
  HTML_INACTIVE,
  POINTER_MEDIA_QUERY
} from './constants'
import { accepts } from './core/input'
import type { ICursorFollower, IGateGlobal } from './interfaces'

// Idempotence: a second print (double-wp_head themes) or a replayed inline
// script (AJAX-transition eval paths) must not clobber the live global.
if (!window.artsCursor) {
  let resolveReady: (cursor: ICursorFollower) => void
  const ready = new Promise<ICursorFollower>((resolve) => {
    resolveReady = resolve
  })
  const gate: IGateGlobal = {
    ready,
    get: () => null,
    version: __ARTS_CURSOR_VERSION__,
    __resolveReady: (cursor) => resolveReady(cursor)
  }
  window.artsCursor = gate

  const html = document.documentElement
  const mql = window.matchMedia(POINTER_MEDIA_QUERY)
  const boot = window.artsCursorFollowerBoot

  const predict = (active: boolean) => {
    html.classList.toggle(HTML_ACTIVE, active)
    html.classList.toggle(HTML_INACTIVE, !active)
  }

  // A broken deploy degrades to "no cursor" instead of leaving theme CSS
  // suppressing hover styles for an engine that never arrives.
  const fail = () => {
    predict(false)
    if (import.meta.env?.DEV) {
      console.warn('[arts-cursor] engine assets failed to load')
    }
  }

  let loaded = false
  const opts = { passive: true, capture: true }

  function disarm() {
    window.removeEventListener('pointermove', onMove, opts)
    window.removeEventListener('wheel', onWheel, opts)
    mql.removeEventListener('change', onChange)
  }

  function load() {
    if (loaded) {
      return
    }
    loaded = true
    disarm()
    if (!boot || document.getElementById(GATE_JS_ID)) {
      return
    }
    const link = document.createElement('link')
    link.id = GATE_CSS_ID
    link.rel = 'stylesheet'
    link.href = boot.css
    // Serialized on purpose: `.arts-cursor`'s hidden/reveal styles exist only
    // once the stylesheet is in — a script that won the race would build
    // unstyled markup.
    link.onload = () => {
      // onload can fire more than once (a moved link re-fires it; test DOMs
      // auto-fire alongside hand-fired events) — same guard as load().
      if (document.getElementById(GATE_JS_ID)) {
        return
      }
      const script = document.createElement('script')
      script.id = GATE_JS_ID
      script.src = boot.js
      script.onerror = fail
      document.head.appendChild(script)
    }
    link.onerror = fail
    document.head.appendChild(link)
  }

  // The mq is re-checked at event time, so a docked mouse's first move loads
  // even where no `change` event fired.
  function onMove(e: PointerEvent) {
    if (accepts(e) && mql.matches) {
      load()
    }
  }

  // Trackpad users often scroll before moving; warms the load.
  function onWheel() {
    if (mql.matches) {
      load()
    }
  }

  // While the engine isn't here, a capability flip revises the prediction in
  // both directions; a flip TO matching is a stronger signal than a move.
  function onChange(e: MediaQueryListEvent) {
    predict(e.matches)
    if (e.matches) {
      load()
    }
  }

  predict(mql.matches)

  if (boot?.editor) {
    // Editor preview loads immediately: boot.ts's kit-change live-preview
    // listener must exist before the first Site Settings change.
    load()
  } else {
    window.addEventListener('pointermove', onMove, opts)
    window.addEventListener('wheel', onWheel, opts)
    mql.addEventListener('change', onChange)
  }
}
