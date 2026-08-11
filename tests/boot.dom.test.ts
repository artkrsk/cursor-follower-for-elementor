// @vitest-environment happy-dom

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
  window.artsCursor?.get()?.destroy()
  delete window.artsCursor
  delete window.artsCursorFollowerOptions
  document.getElementById('arts-cursor')?.remove()
  document.documentElement.className = ''
})

describe('gate handoff', () => {
  it('claims the gate resolver, preserving the gate-era promise identity', async () => {
    let resolve!: (cursor: ICursorFollower) => void
    const ready = new Promise<ICursorFollower>((r) => {
      resolve = r
    })
    window.artsCursor = {
      ready,
      get: () => null,
      version: 'gate-era',
      __resolveReady: resolve
    } as IGateGlobal

    await import('@ts/boot')
    const cursor = await ready

    expect(cursor).toBe(window.artsCursor?.get())
    expect(window.artsCursor?.ready).toBe(ready)
    expect((window.artsCursor as IGateGlobal).__resolveReady).toBeUndefined()
  })

  it('self-creates without a gate (direct import, stripped inline script)', async () => {
    await import('@ts/boot')

    const cursor = await window.artsCursor?.ready
    expect(cursor).toBe(window.artsCursor?.get())
  })
})
