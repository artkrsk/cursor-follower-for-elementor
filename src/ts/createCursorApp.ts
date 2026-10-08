import { createCursorWithLifecycle } from './core/createCursor'
import { getCursorGlobal } from './core/cursorGlobal'
import type { ICursorApp, ICursorAppOptions, ICursorFollower, IGateGlobal } from './interfaces'

export function createCursorApp({ options, signal }: ICursorAppOptions = {}): ICursorApp {
  const lifetime = new AbortController()
  let instance: ICursorFollower | null = null
  let hub: IGateGlobal | undefined
  let started = false

  const destroy = () => {
    if (lifetime.signal.aborted) {
      return
    }
    lifetime.abort()
    signal?.removeEventListener('abort', destroy)
    instance?.destroy()
    instance = null
    if (hub?.__disposeBoot === destroy) {
      delete hub.__disposeBoot
    }
  }

  const boot = () => {
    if (lifetime.signal.aborted || instance || !hub) {
      return
    }
    instance = createCursorWithLifecycle(options, {
      initialized(cursor) {
        if (hub?.__disposeBoot === destroy && !lifetime.signal.aborted) {
          hub.__publish(cursor)
        }
      },
      destroying(cursor) {
        if (hub?.__disposeBoot === destroy && hub.get() === cursor) {
          hub.__publish(null)
        }
      }
    })
    instance.init()
  }

  return {
    signal: lifetime.signal,
    get: () => instance,
    destroy,
    init() {
      if (started || lifetime.signal.aborted) {
        return
      }
      if (signal?.aborted) {
        destroy()
        return
      }
      started = true
      signal?.addEventListener('abort', destroy, { once: true })
      const owner = getCursorGlobal(window)
      hub = owner
      owner.__replaceBoot(() => {
        if (lifetime.signal.aborted) {
          return
        }
        owner.__disposeBoot = destroy
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', boot, {
            once: true,
            signal: lifetime.signal
          })
        } else {
          boot()
        }
      })
    }
  }
}
