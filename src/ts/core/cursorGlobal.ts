import type { ICursorFollower, IGateGlobal } from '../interfaces'
import type { TCursorObserver } from '../types'

/** Window-owned so the inline gate and separately bundled boot share a registry. */
export function getCursorGlobal(win: Window): IGateGlobal {
  if (win.artsCursor) return win.artsCursor as IGateGlobal

  let current: ICursorFollower | null = null
  let revision = 0
  let publishing = 0
  let replacing = false
  let pendingBoot: (() => void) | undefined
  let resolveReady: (cursor: ICursorFollower) => void
  const observers = new Set<TCursorObserver>()
  const hub: IGateGlobal = {
    ready: new Promise((resolve) => {
      resolveReady = resolve
    }),
    get: () => current,
    version: __ARTS_CURSOR_VERSION__,
    __replaceBoot(install) {
      pendingBoot = install
      const flush = () => {
        if (replacing || publishing) return
        replacing = true
        try {
          while (pendingBoot) {
            const next = pendingBoot
            pendingBoot = undefined
            hub.__disposeBoot?.()
            // A teardown observer requested a newer boot; never initialize the superseded one.
            if (!pendingBoot) next()
          }
        } finally {
          replacing = false
        }
      }
      // A direct cursor.destroy() publishes before tearing down. Let its stack finish.
      if (publishing) queueMicrotask(flush)
      else flush()
    },
    observe(listener, { signal } = {}) {
      if (signal?.aborted) return () => {}
      let active = true
      const notify: TCursorObserver = (cursor) => {
        if (!active) return
        try {
          listener(cursor)
        } catch (error) {
          console.error('[arts-cursor] observer failed', error)
        }
      }
      const stop = () => {
        if (!active) return
        active = false
        observers.delete(notify)
        signal?.removeEventListener('abort', stop)
      }
      observers.add(notify)
      signal?.addEventListener('abort', stop, { once: true })
      notify(current)
      return stop
    },
    __publish(cursor) {
      if (current === cursor) return
      current = cursor
      if (cursor) resolveReady(cursor)
      const publication = ++revision
      publishing++
      try {
        for (const notify of [...observers]) {
          // A nested publication has already delivered the newer state.
          if (publication !== revision) break
          notify(cursor)
        }
      } finally {
        publishing--
      }
    }
  }
  win.artsCursor = hub
  return hub
}
