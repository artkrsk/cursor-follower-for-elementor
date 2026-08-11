import type {
  ICursorStats,
  IFrameState,
  IMagneticController,
  IMotionSystem,
  IResolvedOptions,
  ITickerAdapter
} from '../interfaces'
import { createElastic } from './elastic'
import { createFollowerPipeline } from './pipeline'
import { createTransformWriter } from './transformWriter'

/**
 * The frame path, assembled: writer → pipeline → elastic, driven by the ticker.
 *
 * Space semantics live here. Free-roam composes in viewport space; magnetic
 * engagement composes in page space and scroll is subtracted at render time,
 * outside the lerp — which is what keeps the cursor glued while the page
 * scrolls.
 *
 * `state` and `stats` are owned by the caller: `cursor.stats` must return a
 * stable object before init() ever creates this system.
 */

export function createMotion(args: {
  root: HTMLElement
  state: IFrameState
  stats: ICursorStats
  options: Pick<IResolvedOptions, 'trailing' | 'elastic'>
  ticker: ITickerAdapter
  magnetic: IMagneticController
  readScroll: () => void
  getTrailingOverride: () => number | null
}): IMotionSystem {
  const { state, stats, options, magnetic } = args
  let unsubscribe: (() => void) | null = null

  const writer = createTransformWriter(args.root)
  const elastic = createElastic({ state, writer, options })

  const composeTarget = (dt: number) => {
    magnetic.tick(dt)
    if (magnetic.composeTarget()) {
      return
    }
    // Free-roam: viewport space, scroll-independent.
    state.target.x = state.mouseClient.x
    state.target.y = state.mouseClient.y
  }

  const renderPosition = (x: number, y: number) => {
    if (magnetic.engaged) {
      // Page space: scroll subtracted at render, outside the lerp — the glue.
      writer.setTranslate(x - state.scroll.x, y - state.scroll.y)
    } else {
      writer.setTranslate(x, y)
    }
  }

  const sleep = () => {
    unsubscribe?.()
    unsubscribe = null
    stats.active = false
  }

  const pipeline = createFollowerPipeline({
    state,
    getTrailing: () => {
      const override = args.getTrailingOverride()
      return override == null ? options.trailing : override
    },
    composeTarget,
    renderPosition,
    applyElastic: () => elastic.frame(),
    flush: () => writer.flush(),
    mayIdle: () => !magnetic.busy,
    onConverged: sleep
  })

  /** One stable callback — the subscription is re-armed on every wake. */
  const onFrame = (_time: number, dt: number) => {
    // frameMs is a dev-only diagnostic readout; the two clock reads are DEV-only so a
    // shipped frame doesn't pay for them (it reads 0 in production).
    const started = import.meta.env?.DEV ? performance.now() : 0
    pipeline.frame(dt)
    // sqrt over hypot: no overflow guards needed at pixel magnitudes.
    stats.lag = Math.sqrt(state.lag.x * state.lag.x + state.lag.y * state.lag.y)
    if (import.meta.env?.DEV) {
      stats.frameMs = performance.now() - started
    }
  }

  const wake = () => {
    if (unsubscribe) {
      return
    }
    stats.active = true
    unsubscribe = args.ticker.subscribe(onFrame, { priority: 1, label: 'arts-cursor/frame' })
  }

  return {
    wake,
    sleep,
    snap() {
      args.readScroll()
      pipeline.snap()
    },
    snapTo(x, y) {
      state.mouseClient.x = x
      state.mouseClient.y = y
      state.follower.x = x
      state.follower.y = y
      state.target.x = x
      state.target.y = y
      renderPosition(x, y)
      writer.flush()
    },
    setPointer(x, y) {
      state.mouseClient.x = x
      state.mouseClient.y = y
      wake()
    },
    dispose() {
      sleep()
    }
  }
}
