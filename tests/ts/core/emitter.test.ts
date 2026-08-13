import { createEmitter } from '@ts/core/emitter'
import { describe, expect, it, vi } from 'vitest'

interface ITestEvents {
  moved: (x: number, y: number) => void
  done: () => void
}

describe('createEmitter', () => {
  it('delivers the payload to every listener on that event', () => {
    const emitter = createEmitter<ITestEvents>()
    const first = vi.fn()
    const second = vi.fn()

    emitter.on('moved', first)
    emitter.on('moved', second)
    emitter.emit('moved', 3, 4)

    expect(first).toHaveBeenCalledExactlyOnceWith(3, 4)
    expect(second).toHaveBeenCalledExactlyOnceWith(3, 4)
  })

  it('keeps events independent', () => {
    const emitter = createEmitter<ITestEvents>()
    const moved = vi.fn()
    const done = vi.fn()

    emitter.on('moved', moved)
    emitter.on('done', done)
    emitter.emit('done')

    expect(done).toHaveBeenCalledOnce()
    expect(moved).not.toHaveBeenCalled()
  })

  it('stops delivery once the returned unsubscribe is called', () => {
    const emitter = createEmitter<ITestEvents>()
    const listener = vi.fn()

    const off = emitter.on('moved', listener)
    emitter.emit('moved', 1, 1)
    off()
    emitter.emit('moved', 2, 2)

    expect(listener).toHaveBeenCalledExactlyOnceWith(1, 1)
  })

  it('unsubscribes only the listener it belongs to', () => {
    const emitter = createEmitter<ITestEvents>()
    const kept = vi.fn()
    const dropped = vi.fn()

    emitter.on('moved', kept)
    const off = emitter.on('moved', dropped)
    off()
    emitter.emit('moved', 1, 1)

    expect(kept).toHaveBeenCalledOnce()
    expect(dropped).not.toHaveBeenCalled()
  })

  it('is a no-op when nothing is listening', () => {
    const emitter = createEmitter<ITestEvents>()
    expect(() => emitter.emit('done')).not.toThrow()
  })

  it('tolerates the same unsubscribe being called twice', () => {
    const emitter = createEmitter<ITestEvents>()
    const off = emitter.on('done', vi.fn())

    off()
    expect(() => off()).not.toThrow()
  })
})
