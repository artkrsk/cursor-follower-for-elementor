/// <reference path="./env.d.ts" />

import {
  GATE_CSS_ID,
  GATE_JS_ID,
  HTML_ACTIVE,
  HTML_INACTIVE,
  POINTER_MEDIA_QUERY
} from './constants'
import { accepts } from './core/acceptsPointer'
import { getCursorGlobal } from './core/cursorGlobal'
import type { ICursorGate, ICursorGateOptions, ICursorGateScript, IGateGlobal } from './interfaces'

export function createCursorGate(config?: ICursorGateOptions): ICursorGate {
  const lifetime = new AbortController()
  let hub: IGateGlobal | undefined
  let media: MediaQueryList | undefined
  let link: HTMLLinkElement | undefined
  let script: ICursorGateScript | undefined
  let started = false
  let loaded = false
  let booting = false
  const opts = { passive: true, capture: true }

  const predict = (active: boolean) => {
    document.documentElement.classList.toggle(HTML_ACTIVE, active)
    document.documentElement.classList.toggle(HTML_INACTIVE, !active)
  }

  const fail = () => {
    if (lifetime.signal.aborted) {
      return
    }
    predict(false)
    if (import.meta.env?.DEV) {
      console.warn('[arts-cursor] engine assets failed to load')
    }
  }

  const disarm = () => {
    window.removeEventListener('pointermove', onMove, opts)
    window.removeEventListener('wheel', onWheel, opts)
    media?.removeEventListener('change', onChange)
  }

  const load = () => {
    if (loaded || lifetime.signal.aborted) {
      return
    }
    loaded = true
    disarm()
    if (!config || document.getElementById(GATE_JS_ID)) {
      return
    }
    link = document.createElement('link')
    link.id = GATE_CSS_ID
    link.rel = 'stylesheet'
    link.href = config.css
    link.onload = () => {
      if (booting || lifetime.signal.aborted || document.getElementById(GATE_JS_ID)) {
        return
      }
      booting = true
      if (config.load) {
        const initialize = config.load
        Promise.resolve()
          .then(() => {
            if (!lifetime.signal.aborted) {
              return initialize(lifetime.signal)
            }
          })
          .catch(fail)
      } else if (config.js) {
        script = document.createElement('script') as ICursorGateScript
        script.id = GATE_JS_ID
        script.__artsCursorSignal = lifetime.signal
        script.src = config.js
        script.onerror = fail
        document.head.appendChild(script)
      }
    }
    link.onerror = fail
    document.head.appendChild(link)
  }

  function onMove(event: PointerEvent) {
    if (accepts(event) && media?.matches) {
      load()
    }
  }

  function onWheel() {
    if (media?.matches) {
      load()
    }
  }

  function onChange(event: MediaQueryListEvent) {
    predict(event.matches)
    if (event.matches) {
      load()
    }
  }

  const destroy = () => {
    if (lifetime.signal.aborted) {
      return
    }
    lifetime.abort()
    if (!started) {
      return
    }
    disarm()
    if (link) {
      link.onload = null
      link.onerror = null
      link.remove()
    }
    if (script) {
      script.onerror = null
      script.remove()
    }
    if (hub?.__disposeGate === destroy) {
      delete hub.__disposeGate
      if (!hub.get()) {
        predict(false)
      }
    }
  }

  return {
    signal: lifetime.signal,
    destroy,
    init() {
      if (started || lifetime.signal.aborted) {
        return
      }
      started = true
      hub = getCursorGlobal(window)
      const previous = hub.__disposeGate
      hub.__disposeGate = destroy
      previous?.()
      if (lifetime.signal.aborted) {
        return
      }
      media = window.matchMedia(POINTER_MEDIA_QUERY)
      predict(media.matches)
      if (config?.editor) {
        load()
      } else {
        window.addEventListener('pointermove', onMove, opts)
        window.addEventListener('wheel', onWheel, opts)
        media.addEventListener('change', onChange)
      }
    }
  }
}
