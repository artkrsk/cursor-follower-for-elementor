// @vitest-environment happy-dom

import { getCursorGlobal } from '@ts/core/cursorGlobal'
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
