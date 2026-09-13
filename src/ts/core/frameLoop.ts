import type { ITickerAdapter } from '../interfaces'

/** One subscription owns the ordering of every automatic engine frame. */
export function createFrameLoop(args: {
  ticker: ITickerAdapter
  measure: () => void
  render: (dt: number) => void
  busy: () => boolean
}) {
  let stop: (() => void) | null = null
  let running = false
  let disposed = false

  const reconcile = () => {
    if (disposed || running) return
    if (args.busy()) {
      stop ??= args.ticker.subscribe(frame, { priority: 1, label: 'arts-cursor/frame' })
    } else {
      stop?.()
      stop = null
    }
  }
  const frame = (_time: number, dt: number) => {
    if (disposed) return
    running = true
    try {
      args.measure()
      if (disposed) return
      args.render(dt)
    } finally {
      running = false
      reconcile()
    }
  }
  return {
    schedule: reconcile,
    dispose() {
      disposed = true
      stop?.()
      stop = null
    }
  }
}
