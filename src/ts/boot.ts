/**
 * WordPress plugin entry (side-effect boot). The library surface stays in
 * index.ts; this file wires the page: discovery global, options intake, init,
 * and the Elementor editor live-preview listener.
 *
 * Discovery contract: `window.artsCursor` exists from parse time with a
 * pending `ready` promise, so consumer code that loads first can await it
 * race-free. `ready` resolves once the engine initializes — i.e. whenever
 * the plugin is active and this script runs.
 */

import { createCursor } from './core/createCursor'
import type { ICursorFollower, ICursorOptions, IGateGlobal } from './interfaces'
import { mapKitSettings } from './kitSettings'

// Window typings live in global.d.ts (the consumer-facing contract).

let instance: ICursorFollower | null = null

// When the wp_head gate printed, it installed the global at parse time with a
// pending `ready`; claim its resolver so consumers holding that promise see
// it resolve. Without a gate (direct bundle import, inline script stripped by
// an optimizer) fall back to self-creating — the pre-gate contract.
const gate = window.artsCursor as IGateGlobal | undefined
let resolveReady: (cursor: ICursorFollower) => void
const ready = gate?.__resolveReady
  ? gate.ready
  : new Promise<ICursorFollower>((resolve) => {
      resolveReady = resolve
    })
if (gate?.__resolveReady) {
  resolveReady = gate.__resolveReady
}

window.artsCursor = {
  ready,
  get: () => instance,
  version: __ARTS_CURSOR_VERSION__
}

const createAndInit = (options?: ICursorOptions) => {
  instance = createCursor(options)
  instance.init()
  resolveReady(instance)
}

const boot = () => {
  createAndInit(window.artsCursorFollowerOptions)
}

// Elementor editor live preview: the PHP-printed bridge in the editor window
// forwards kit-setting changes into this (preview) window. Inert elsewhere —
// the event never originates outside the editor.
let remeasureScheduled = false
window.addEventListener('arts-cursor:kit-change', (e) => {
  const settings = e.detail?.settings
  if (!settings) {
    return
  }
  instance?.updateOptions(mapKitSettings(settings))
  // Selectors-based controls (size, border width, label typography) land as kit
  // CSS, already applied by the time this event arrives — the engine only needs
  // to re-sample what it measures. The rAF coalesces slider-drag bursts:
  // Elementor fires a change per tick.
  if (!remeasureScheduled) {
    remeasureScheduled = true
    requestAnimationFrame(() => {
      remeasureScheduled = false
      instance?.remeasure()
    })
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true })
} else {
  boot()
}
