// @vitest-environment happy-dom

import { getCursorGlobal } from '@ts/core/cursorGlobal'
import { createCursorApp } from '@ts/createCursorApp'
import type { ICursorFollower, IGateGlobal } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * boot.ts is a side-effect module and, unlike the gate, importing it boots
 * the full engine (happy-dom has matchMedia + both observers, so init()
 * succeeds). Each test resets modules and destroys the instance after.
 */

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  ;(window.artsCursor as IGateGlobal | undefined)?.__disposeBoot?.()
  delete window.artsCursor
  delete window.artsCursorFollowerOptions
  document.getElementById('arts-cursor')?.remove()
  document.documentElement.className = ''
  vi.restoreAllMocks()
})

describe('public app lifecycle', () => {
  it('is passive until explicitly initialized and stays retired after destruction', () => {
    const app = createCursorApp()
    expect(window.artsCursor).toBeUndefined()
    expect(document.getElementById('arts-cursor')).toBeNull()
    app.init()
    const cursor = app.get()
    expect(window.artsCursor?.get()).toBe(cursor)
    app.init()
    expect(app.get()).toBe(cursor)
    app.destroy()
    app.init()
    expect(app.get()).toBeNull()
    expect(window.artsCursor?.get()).toBeNull()
  })

  it('does not install a global when its captured loader signal is already aborted', () => {
    const lifetime = new AbortController()
    lifetime.abort()
    const app = createCursorApp({ signal: lifetime.signal })
    app.init()
    expect(window.artsCursor).toBeUndefined()
  })

  it('cancels pending DOM-ready initialization', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    const app = createCursorApp()
    app.init()
    app.destroy()
    document.dispatchEvent(new Event('DOMContentLoaded'))
    expect(window.artsCursor?.get()).toBeNull()
    expect(document.getElementById('arts-cursor')).toBeNull()
  })

  it('keeps the newest owner when observers replace an initializing app', () => {
    const hub = getCursorGlobal(window)
    const first = createCursorApp()
    const second = createCursorApp()
    let replace = true
    hub.observe((cursor) => {
      if (cursor && replace) {
        replace = false
        second.init()
      }
    })
    first.init()
    expect(first.signal.aborted).toBe(true)
    expect(hub.get()).toBe(second.get())
    first.destroy()
    expect(hub.get()).toBe(second.get())
  })

  it('refuses a downloaded classic bootstrap from a retired gate', async () => {
    const lifetime = new AbortController()
    lifetime.abort()
    const script = Object.assign(document.createElement('script'), {
      __artsCursorSignal: lifetime.signal
    })
    vi.spyOn(document, 'currentScript', 'get').mockReturnValue(script)
    await import('@ts/boot')
    expect(window.artsCursor).toBeUndefined()
  })
})

describe('gate handoff', () => {
  it('preserves the gate namespace, promise and subscriptions', async () => {
    const gate = getCursorGlobal(window)
    const ready = gate.ready
    const observed = vi.fn()
    gate.observe(observed)

    await import('@ts/boot')
    const cursor = await ready

    expect(cursor).toBe(window.artsCursor?.get())
    expect(window.artsCursor?.ready).toBe(ready)
    expect(window.artsCursor).toBe(gate)
    expect(observed.mock.calls).toEqual([[null], [cursor]])
  })

  it('self-creates without a gate (direct import, stripped inline script)', async () => {
    await import('@ts/boot')

    const cursor = await window.artsCursor?.ready
    expect(cursor).toBe(window.artsCursor?.get())
  })

  it('publishes before ready and withdraws before internal teardown; re-init stays observable', async () => {
    const gate = getCursorGlobal(window)
    const seen: Array<ICursorFollower | null> = []
    let old: ICursorFollower | null = null
    gate.observe((cursor) => {
      seen.push(cursor)
      if (!cursor && old) expect(old.el).not.toBeNull()
    })
    const ready = vi.fn(() => expect(gate.get()).not.toBeNull())
    document.addEventListener('arts-cursor:ready', ready)
    await import('@ts/boot')
    old = gate.get()
    if (!old) throw new Error('Expected an initialized cursor')
    old.init()
    old.destroy()
    old.destroy()
    expect(gate.get()).toBeNull()
    old.init()
    expect(seen).toEqual([null, old, null, old])
    expect(ready).toHaveBeenCalledTimes(2)
    document.removeEventListener('arts-cursor:ready', ready)
  })

  it('replaces a boot owner without replacing the hub; an old disposer is inert', async () => {
    await import('@ts/boot')
    const hub = getCursorGlobal(window)
    const first = hub.get()
    const staleDispose = hub.__disposeBoot
    if (!first || !staleDispose) throw new Error('Expected a boot owner')
    const seen = vi.fn()
    hub.observe(seen)
    vi.resetModules()
    await import('@ts/boot')
    const next = hub.get()
    expect(next).not.toBe(first)
    expect(first.el).toBeNull()
    expect(window.artsCursor).toBe(hub)
    staleDispose()
    expect(hub.get()).toBe(next)
    expect(seen.mock.calls).toEqual([[first], [null], [next]])
  })
})
