import { createSession } from '@ts/core/session'
import { describe, expect, it, vi } from 'vitest'

describe('createSession', () => {
  it('release() invokes the wrapped callback', () => {
    const release = vi.fn()
    createSession(release).release()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('[Symbol.dispose]() is the same release path — `using` support', () => {
    const release = vi.fn()
    createSession(release)[Symbol.dispose]()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('importing the module guarantees Symbol.dispose exists (older-runtime polyfill)', () => {
    expect(typeof Symbol.dispose).toBe('symbol')
  })
})
