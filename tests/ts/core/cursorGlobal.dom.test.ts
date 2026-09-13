// @vitest-environment happy-dom

import { getCursorGlobal } from '@ts/core/cursorGlobal'
import type { ICursorFollower } from '@ts/interfaces'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  delete window.artsCursor
  vi.restoreAllMocks()
})

describe('cursor observation', () => {
  it('serializes a nested boot request behind outgoing teardown and skips a superseded install', () => {
    const hub = getCursorGlobal(window)
    const order: string[] = []
    hub.__disposeBoot = () => {
      order.push('destroy begin')
      delete hub.__disposeBoot
      hub.__replaceBoot(() => {
        order.push('latest init')
      })
      order.push('destroy end')
    }
    hub.__replaceBoot(() => {
      order.push('superseded init')
    })
    expect(order).toEqual(['destroy begin', 'destroy end', 'latest init'])
  })

  it('defers a boot requested during direct-destroy publication until teardown returns', async () => {
    const hub = getCursorGlobal(window)
    const order: string[] = []
    hub.__publish(cursor)
    hub.observe((value) => {
      if (!value)
        hub.__replaceBoot(() => {
          order.push('new init')
        })
    })
    hub.__publish(null)
    order.push('teardown')
    await Promise.resolve()
    expect(order).toEqual(['teardown', 'new init'])
  })

  const cursor = { enabled: false } as ICursorFollower

  it('replays null and then a disabled-but-live instance, once per transition', () => {
    const hub = getCursorGlobal(window)
    const seen = vi.fn()
    hub.observe(seen)
    hub.__publish(cursor)
    hub.__publish(cursor)
    const late = vi.fn()
    hub.observe(late)
    hub.__publish(null)
    expect(seen.mock.calls).toEqual([[null], [cursor], [null]])
    expect(late.mock.calls).toEqual([[cursor], [null]])
  })

  it('does not replay an aborted subscription and releases on abort or explicit stop', () => {
    const hub = getCursorGlobal(window)
    const owner = new AbortController()
    const seen = vi.fn()
    const stop = hub.observe(seen, { signal: owner.signal })
    owner.abort()
    stop()
    stop()
    hub.observe(seen, { signal: owner.signal })()
    hub.__publish(cursor)
    expect(seen.mock.calls).toEqual([[null]])
  })

  it('can cancel during replay or cancel a later subscriber during publication', () => {
    const hub = getCursorGlobal(window)
    const owner = new AbortController()
    const seen = vi.fn(() => owner.abort())
    hub.observe(seen, { signal: owner.signal })
    const later = vi.fn()
    const laterOwner = new AbortController()
    hub.observe((value) => {
      if (value) laterOwner.abort()
    })
    hub.observe(later, { signal: laterOwner.signal })
    hub.__publish(cursor)
    expect(seen).toHaveBeenCalledOnce()
    expect(later.mock.calls).toEqual([[null]])
  })

  it('never sends an older state after a nested publication', () => {
    const hub = getCursorGlobal(window)
    hub.observe((value) => {
      if (value) hub.__publish(null)
    })
    const seen = vi.fn()
    hub.observe(seen)
    hub.__publish(cursor)
    expect(seen.mock.calls).toEqual([[null], [null]])
    expect(hub.get()).toBeNull()
  })

  it('isolates subscriber failures from state and other subscribers', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const hub = getCursorGlobal(window)
    hub.observe(() => {
      throw new Error('consumer')
    })
    const seen = vi.fn()
    hub.observe(seen)
    expect(() => hub.__publish(cursor)).not.toThrow()
    expect(seen).toHaveBeenLastCalledWith(cursor)
  })
})
