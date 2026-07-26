import { FRAME_60 } from '@ts/constants'
import { createMotion } from '@ts/follower/motion'
import type { ICursorStats, IFrameState, IMagneticController } from '@ts/interfaces'
import { lerpFactor } from '@ts/utils'
import { describe, expect, it, vi } from 'vitest'
import { fakeTicker, makeFrameState } from '../support'

/**
 * The frame path assembled — pipeline and elastic are each covered in isolation,
 * but their composition is where the two coordinate spaces live, and that is the
 * engine's core invariant.
 *
 * No DOM: createTransformWriter falls to its string path when the root has no
 * attributeStyleMap, so a `{ style: {} }` object is a legitimate root and the
 * transform it writes is readable as the assertion surface. The ticker is
 * injected and stepped by hand, which is what makes each frame deterministic.
 */

const fakeRoot = () => ({ style: {} as { transform?: string } })

const fakeMagnetic = (over: Partial<IMagneticController> = {}) =>
  ({
    engaged: false,
    busy: false,
    tick: vi.fn(),
    composeTarget: vi.fn(() => false),
    engage: vi.fn(),
    engageLive: vi.fn(),
    release: vi.fn(),
    dispose: vi.fn(),
    ...over
  }) as unknown as IMagneticController & { tick: ReturnType<typeof vi.fn> }

const setup = (
  over: {
    state?: IFrameState
    magnetic?: IMagneticController
    trailing?: number
    elastic?: false | { strength: number; max: number }
    trailingOverride?: number | null
  } = {}
) => {
  const state = over.state ?? makeFrameState()
  const stats: ICursorStats = { frameMs: 0, active: false, lag: 0 }
  const root = fakeRoot()
  const ticker = fakeTicker()
  const magnetic = over.magnetic ?? fakeMagnetic()
  const readScroll = vi.fn()
  const motion = createMotion({
    root: root as unknown as HTMLElement,
    state,
    stats,
    options: { trailing: over.trailing ?? 0.2, elastic: over.elastic ?? false },
    ticker: ticker.adapter,
    magnetic,
    readScroll,
    getTrailingOverride: () => over.trailingOverride ?? null
  })
  return { motion, state, stats, root, ticker, magnetic, readScroll }
}

/** The engaged controller composes a page-space target, as the real one does. */
const engagedAt = (state: IFrameState, x: number, y: number) =>
  fakeMagnetic({
    engaged: true,
    composeTarget: vi.fn(() => {
      state.target.x = x
      state.target.y = y
      return true
    })
  })

describe('coordinate spaces', () => {
  /**
   * The glue. Engaged, the target is a PAGE coordinate and scroll is subtracted
   * at render — outside the lerp — so the cursor stays welded to its anchor
   * while the page scrolls under it.
   */
  it('subtracts scroll at render time while engaged', () => {
    const state = makeFrameState({ scroll: { x: 0, y: 100 } })
    const { motion, root } = setup({ state, magnetic: engagedAt(state, 200, 300) })

    motion.snap()

    expect(root.style.transform).toContain('translate(200px, 200px)')
  })

  /** Free-roam is viewport space: scrolling must never drag the cursor off the
      pointer, so the same scroll offset is NOT applied here. */
  it('leaves viewport coordinates untouched while free-roaming', () => {
    const state = makeFrameState({ mouseClient: { x: 200, y: 300 }, scroll: { x: 0, y: 100 } })
    const { motion, root } = setup({ state })

    motion.snap()

    expect(root.style.transform).toContain('translate(200px, 300px)')
  })

  it('follows the scroll offset frame by frame while engaged', () => {
    const state = makeFrameState({ scroll: { x: 0, y: 100 } })
    const { motion, root, ticker } = setup({ state, magnetic: engagedAt(state, 200, 300) })
    motion.snap()

    state.scroll.y = 160
    motion.wake()
    ticker.step()

    expect(root.style.transform).toContain('translate(200px, 140px)')
  })
})

describe('target composition', () => {
  /** The controller owns the target when it is engaged — this is the branch the
      whole page-space mode hangs off. */
  it('yields the target to the magnetic controller when it claims the frame', () => {
    const state = makeFrameState({ mouseClient: { x: 999, y: 999 } })
    const { motion, ticker } = setup({ state, magnetic: engagedAt(state, 200, 300) })

    motion.wake()
    ticker.step()

    expect(state.target).toEqual({ x: 200, y: 300 })
  })

  it('falls back to the pointer in viewport space when it does not', () => {
    const state = makeFrameState({ mouseClient: { x: 40, y: 60 } })
    const { motion, ticker } = setup({ state })

    motion.wake()
    ticker.step()

    expect(state.target).toEqual({ x: 40, y: 60 })
  })

  it('advances the controller with the frame delta', () => {
    const magnetic = fakeMagnetic()
    const { motion, ticker } = setup({ magnetic })

    motion.wake()
    ticker.step(32)

    expect(magnetic.tick).toHaveBeenCalledExactlyOnceWith(32)
  })
})

describe('trailing', () => {
  it('smooths at the configured rate', () => {
    const state = makeFrameState({ mouseClient: { x: 100, y: 0 } })
    const { motion, ticker } = setup({ state, trailing: 0.2 })

    motion.wake()
    ticker.step()

    expect(state.follower.x).toBeCloseTo(100 * lerpFactor(0.2, FRAME_60), 10)
  })

  /** The magnetic handoff rate: while a session overrides trailing, the override
      wins over the configured value. */
  it('prefers a live override over the configured rate', () => {
    const state = makeFrameState({ mouseClient: { x: 100, y: 0 } })
    const { motion, ticker } = setup({ state, trailing: 0.2, trailingOverride: 0.5 })

    motion.wake()
    ticker.step()

    expect(state.follower.x).toBeCloseTo(100 * lerpFactor(0.5, FRAME_60), 10)
  })
})

describe('the loop', () => {
  it('subscribes once however often it is woken', () => {
    const { motion, ticker } = setup()

    motion.wake()
    motion.wake()

    expect(ticker.count).toBe(1)
  })

  it('flags itself active while subscribed', () => {
    const { motion, stats } = setup()

    motion.wake()

    expect(stats.active).toBe(true)
  })

  it('unsubscribes and clears the flag on sleep', () => {
    const { motion, ticker, stats } = setup()
    motion.wake()

    motion.sleep()

    expect(ticker.subscribed).toBe(false)
    expect(stats.active).toBe(false)
  })

  it('sleeps on dispose', () => {
    const { motion, ticker } = setup()
    motion.wake()

    motion.dispose()

    expect(ticker.subscribed).toBe(false)
  })

  it('wakes on a new pointer position', () => {
    const { motion, state, ticker } = setup()

    motion.setPointer(12, 34)

    expect(state.mouseClient).toEqual({ x: 12, y: 34 })
    expect(ticker.subscribed).toBe(true)
  })

  it('sleeps once the follower converges on its target', () => {
    const { motion, ticker } = setup()

    motion.wake()
    ticker.step()

    expect(ticker.subscribed).toBe(false)
  })

  /** Magnetic engagement keeps the loop alive even at rest: the anchor can move
      under a still pointer, so convergence is not permission to stop. */
  it('keeps running at rest while the controller is busy', () => {
    const magnetic = fakeMagnetic({ busy: true })
    const { motion, ticker } = setup({ magnetic })

    motion.wake()
    ticker.step()

    expect(ticker.subscribed).toBe(true)
  })
})

describe('stats', () => {
  it('reports lag as the distance still left after the step', () => {
    const state = makeFrameState({ mouseClient: { x: 300, y: 400 } })
    const { motion, stats, ticker } = setup({ state })

    motion.wake()
    ticker.step()

    expect(stats.lag).toBeCloseTo(Math.hypot(state.lag.x, state.lag.y), 10)
    expect(stats.lag).toBeGreaterThan(0)
  })

  /** frameMs is a dev-only diagnostic readout; the two clock reads are DEV-only, so a
      shipped frame (DEV forced false by test-setup) leaves it at 0. */
  it('does not time the frame outside DEV', () => {
    const { motion, stats, ticker } = setup()

    motion.wake()
    ticker.step()

    expect(stats.frameMs).toBe(0)
  })

  it('times the frame when DEV is on', () => {
    vi.stubEnv('DEV', true)
    const now = vi.spyOn(performance, 'now').mockReturnValueOnce(5).mockReturnValue(9)
    const { motion, stats, ticker } = setup()

    motion.wake()
    ticker.step()

    expect(stats.frameMs).toBe(4)
    now.mockRestore()
    vi.unstubAllEnvs()
  })
})

describe('snapping', () => {
  it('reads the scroll offset before composing', () => {
    const { motion, readScroll } = setup()

    motion.snap()

    expect(readScroll).toHaveBeenCalledOnce()
  })

  /** Materializing at the pointer: every vector moves together so the next
      frame has nothing to catch up on — no glide-in from the previous spot. */
  it('puts every vector on the same point and paints it', () => {
    const { motion, state, root } = setup()

    motion.snapTo(120, 80)

    expect(state.mouseClient).toEqual({ x: 120, y: 80 })
    expect(state.follower).toEqual({ x: 120, y: 80 })
    expect(state.target).toEqual({ x: 120, y: 80 })
    expect(root.style.transform).toContain('translate(120px, 80px)')
  })
})

describe('elastic', () => {
  it('squashes the root while the follower trails its target', () => {
    const state = makeFrameState({ mouseClient: { x: 4000, y: 0 } })
    const { motion, root, ticker } = setup({ state, elastic: { strength: 1, max: 0.5 } })

    motion.wake()
    ticker.step()

    expect(root.style.transform).not.toContain('matrix(1, 0, 0, 1')
  })

  it('leaves the matrix at rest when elastic is switched off', () => {
    const state = makeFrameState({ mouseClient: { x: 4000, y: 0 } })
    const { motion, root, ticker } = setup({ state, elastic: false })

    motion.wake()
    ticker.step()

    expect(root.style.transform).toContain('matrix(1, 0, 0, 1')
  })
})
