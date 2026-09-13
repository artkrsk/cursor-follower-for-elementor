/**
 * WordPress entry. Keep the gate's namespace and observer registry across
 * engine replacement. The first-init promise is not a lifetime.
 */
import { createCursorWithLifecycle } from './core/createCursor'
import { getCursorGlobal } from './core/cursorGlobal'
import type { ICursorFollower } from './interfaces'
import { mapKitSettings } from './kitSettings'

const hub = getCursorGlobal(window)
hub.__replaceBoot(() => {
  const lifetime = new AbortController()
  let instance: ICursorFollower | null = null
  let frame = 0

  const dispose = () => {
    if (lifetime.signal.aborted) return
    lifetime.abort()
    cancelAnimationFrame(frame)
    instance?.destroy()
    instance = null
    if (hub.__disposeBoot === dispose) delete hub.__disposeBoot
  }
  hub.__disposeBoot = dispose

  const boot = () => {
    if (lifetime.signal.aborted || instance) return
    instance = createCursorWithLifecycle(window.artsCursorFollowerOptions, {
      initialized(cursor) {
        if (hub.__disposeBoot === dispose && !lifetime.signal.aborted) hub.__publish(cursor)
      },
      destroying(cursor) {
        if (hub.__disposeBoot === dispose && hub.get() === cursor) hub.__publish(null)
      }
    })
    instance.init()
  }

  // Kit CSS already landed when this bridge fires; coalesce its remeasurement.
  window.addEventListener(
    'arts-cursor:kit-change',
    (e) => {
      const settings = e.detail?.settings
      if (!settings) return
      hub.get()?.updateOptions(mapKitSettings(settings))
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          hub.get()?.remeasure()
        })
      }
    },
    { signal: lifetime.signal }
  )

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true, signal: lifetime.signal })
  } else {
    boot()
  }
})
