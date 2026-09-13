import { createFrameLoop } from '@ts/core/frameLoop'
import { describe, expect, it, vi } from 'vitest'
import { fakeTicker } from '../support'

describe('cursor frame coordinator', () => {
  it('measures before rendering and sleeps on convergence', () => {
    const ticker = fakeTicker()
    let busy = true
    const order: string[] = []
    const loop = createFrameLoop({
      ticker: ticker.adapter,
      measure: () => {
        order.push('measure')
      },
      render: () => {
        order.push('render')
        busy = false
      },
      busy: () => busy
    })
    loop.schedule()
    loop.schedule()
    expect(ticker.count).toBe(1)
    ticker.step(10)
    expect(order).toEqual(['measure', 'render'])
    expect(ticker.count).toBe(0)
    busy = true
    loop.schedule()
    expect(ticker.count).toBe(1)
    loop.dispose()
    loop.schedule()
    expect(ticker.count).toBe(0)
  })
  it('does not render after disposal during measurement', () => {
    const ticker = fakeTicker()
    const render = vi.fn()
    const loop = createFrameLoop({
      ticker: ticker.adapter,
      measure: () => loop.dispose(),
      render,
      busy: () => true
    })
    loop.schedule()
    ticker.step()
    expect(render).not.toHaveBeenCalled()
    expect(ticker.count).toBe(0)
  })
})
