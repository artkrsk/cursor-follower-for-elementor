import { createInternalTicker } from '@ts/core/ticker'
import type { TTickerCallback } from '@ts/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The ticker that ships whenever no host ticker is injected — every other test
 * in the suite hands the engine a fake, so this file is the only thing that
 * exercises the real loop.
 *
 * rAF is not a global in the node environment, so the stub is the entire
 * implementation: it hands out handles, holds the pending callback, and a test
 * runs a frame by calling it with a timestamp it chose. `performance.now` is
 * real here and drives the epoch, so it is spied wherever a test asserts on
 * `time` (restoreMocks puts it back).
 */

const fakeRaf = () => {
  let nextHandle = 1
  const pending = new Map<number, FrameRequestCallback>()
  const cancelled: number[] = []

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const handle = nextHandle++
    pending.set(handle, cb)
    return handle
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    cancelled.push(handle)
    pending.delete(handle)
  })

  return {
    /** How many rAFs are currently armed — 1 is the whole point of `scheduled`. */
    get armed() {
      return pending.size
    },
    cancelled,
    frame(now: number) {
      const due = [...pending.values()]
      pending.clear()
      for (const cb of due) {
        cb(now)
      }
    }
  }
}

let raf: ReturnType<typeof fakeRaf>

beforeEach(() => {
  raf = fakeRaf()
})

describe('scheduling', () => {
  it('arms a frame on the first subscribe', () => {
    createInternalTicker().subscribe(() => {})

    expect(raf.armed).toBe(1)
  })

  it('keeps the loop going while a subscriber remains', () => {
    createInternalTicker().subscribe(() => {})

    raf.frame(16)

    expect(raf.armed).toBe(1)
  })

  /**
   * The reason `scheduled` exists: a subscriber that sleeps and wakes the engine
   * inside its own callback re-arms from the wake, and the tick tail would then
   * arm a second one — two ticks per frame, compounding every frame after.
   */
  it('arms only one frame when a callback sleeps and wakes inside the tick', () => {
    const ticker = createInternalTicker()
    let unsubscribe: (() => void) | null = null
    const sleepWake: TTickerCallback = () => {
      unsubscribe?.()
      ticker.subscribe(() => {})
    }
    unsubscribe = ticker.subscribe(sleepWake)

    raf.frame(16)

    expect(raf.armed).toBe(1)
  })

  it('adds no second frame when a second subscriber joins', () => {
    const ticker = createInternalTicker()
    ticker.subscribe(() => {})

    ticker.subscribe(() => {})

    expect(raf.armed).toBe(1)
  })
})

describe('callback arguments', () => {
  it('counts frames from one, once per tick', () => {
    const frames: number[] = []
    createInternalTicker().subscribe((_t, _d, frame) => frames.push(frame))

    raf.frame(16)
    raf.frame(32)
    raf.frame(48)

    expect(frames).toEqual([1, 2, 3])
  })

  it('reports the gap since the previous timestamp as the delta', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    const deltas: number[] = []
    createInternalTicker().subscribe((_t, delta) => deltas.push(delta))

    raf.frame(1016)
    raf.frame(1048)

    expect(deltas).toEqual([16, 32])
  })

  /** `time` is relative to the first subscribe, not to the clock's own epoch —
      an injected ticker may count from anywhere, so the internal one defines
      the zero the engine would see. */
  it('counts time from the first subscribe', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5000)
    const times: number[] = []
    createInternalTicker().subscribe((time) => times.push(time))

    raf.frame(5016)

    expect(times).toEqual([16])
  })

  it('keeps the original epoch across a full stop and restart', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    const ticker = createInternalTicker()
    const release = ticker.subscribe(() => {})
    raf.frame(1016)
    release()

    now.mockReturnValue(9000)
    const times: number[] = []
    ticker.subscribe((time) => times.push(time))
    raf.frame(9016)

    expect(times).toEqual([8016])
  })
})

describe('unsubscribe', () => {
  it('stops the loop and cancels the armed frame when the last one leaves', () => {
    const release = createInternalTicker().subscribe(() => {})

    release()

    expect(raf.armed).toBe(0)
    expect(raf.cancelled).toHaveLength(1)
  })

  it('keeps running while another subscriber is left', () => {
    const ticker = createInternalTicker()
    const release = ticker.subscribe(() => {})
    const survivor = vi.fn()
    ticker.subscribe(survivor)

    release()
    raf.frame(16)

    expect(raf.cancelled).toHaveLength(0)
    expect(survivor).toHaveBeenCalledOnce()
  })

  it('is inert when called twice', () => {
    const release = createInternalTicker().subscribe(() => {})

    release()
    release()

    expect(raf.cancelled).toHaveLength(1)
  })

  it('re-arms the loop when a subscriber returns after a full stop', () => {
    const ticker = createInternalTicker()
    const release = ticker.subscribe(() => {})
    release()

    ticker.subscribe(() => {})

    expect(raf.armed).toBe(1)
  })

  /** Direct Set iteration on the frame path is what avoids a per-frame copy;
      this is the Set semantics that make it safe. */
  it('skips a subscriber removed by an earlier one in the same tick', () => {
    const ticker = createInternalTicker()
    const later = vi.fn()
    let releaseLater: (() => void) | null = null
    ticker.subscribe(() => releaseLater?.())
    releaseLater = ticker.subscribe(later)

    raf.frame(16)

    expect(later).not.toHaveBeenCalled()
  })

  /** How the engine actually idles: the pipeline converges and sleep()
      unsubscribes from inside the frame callback. The loop has to stop there,
      not arm one more frame on the way out. */
  it('stops the loop when the only subscriber removes itself mid-tick', () => {
    const ticker = createInternalTicker()
    let releaseSelf: (() => void) | null = null
    releaseSelf = ticker.subscribe(() => releaseSelf?.())

    raf.frame(16)

    expect(raf.armed).toBe(0)
  })

  it('lets a subscriber remove itself mid-tick without stopping the others', () => {
    const ticker = createInternalTicker()
    const survivor = vi.fn()
    let releaseSelf: (() => void) | null = null
    releaseSelf = ticker.subscribe(() => releaseSelf?.())
    ticker.subscribe(survivor)

    raf.frame(16)
    raf.frame(32)

    expect(survivor).toHaveBeenCalledTimes(2)
  })
})
