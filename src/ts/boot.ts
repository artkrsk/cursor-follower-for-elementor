/**
 * WordPress entry. Keep the gate's namespace and observer registry across
 * engine replacement. The first-init promise is not a lifetime.
 */
import { createCursorApp } from './createCursorApp'
import type { ICursorGateScript } from './interfaces'
import { mapKitSettings } from './kitSettings'

const signal = (document.currentScript as ICursorGateScript | null)?.__artsCursorSignal
if (!signal?.aborted) {
  const app = createCursorApp({
    options: window.artsCursorFollowerOptions ?? {},
    ...(signal ? { signal } : {})
  })
  let frame = 0
  app.signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true })

  // Kit CSS already landed when this bridge fires; coalesce its remeasurement.
  window.addEventListener(
    'arts-cursor:kit-change',
    (e) => {
      const settings = e.detail?.settings
      if (!settings) {
        return
      }
      app.get()?.updateOptions(mapKitSettings(settings))
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          app.get()?.remeasure()
        })
      }
    },
    { signal: app.signal }
  )

  app.init()
}
