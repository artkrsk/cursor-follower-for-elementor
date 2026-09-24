// @vitest-environment happy-dom

import {
  DEFAULT_ATTRIBUTE,
  DRAGGING_ATTR,
  HIGHLIGHT_ATTR,
  HTML_NO_NATIVE,
  LOADING_ATTR,
  MAGNETIC_ATTR,
  PRESSED_ATTR
} from '@ts/constants'
import { createCursor } from '@ts/core/createCursor'
import type { ICursorFollower, ICursorTargetSession } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeMedia, fakeTicker } from '../support'

let cursor: ICursorFollower
let ticker: ReturnType<typeof fakeTicker>
let a: HTMLElement
let b: HTMLElement
const pointer = (target: EventTarget, type: string, x = 60, y = 50, extra = {}) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerType: 'mouse',
      button: 0,
      clientX: x,
      clientY: y,
      ...extra
    })
  )
const settleFrames = () => {
  for (let i = 0; i < 200; i++) ticker.step()
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = `<button id="a" ${DEFAULT_ATTRIBUTE}='{"magnetic":true,"elementScale":0.8}'>A</button><button id="b">B</button>`
  a = document.getElementById('a') as HTMLElement
  b = document.getElementById('b') as HTMLElement
  vi.spyOn(a, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 100
  } as DOMRect)
  vi.spyOn(document, 'elementFromPoint').mockReturnValue(a)
  ticker = fakeTicker()
  cursor = createCursor({ ticker: ticker.adapter })
  cursor.init()
  pointer(a, 'pointermove')
  pointer(a, 'pointerover')
  ticker.step()
})
afterEach(() => {
  cursor.destroy()
  vi.useRealTimers()
})

describe('target suspension', () => {
  it('waits for finite element return and style restoration while free following continues', async () => {
    pointer(a, 'pointerdown')
    const session = cursor.suspendTargets()
    const done = vi.fn()
    void session.settled.then(done)
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    expect(cursor.el?.hasAttribute(MAGNETIC_ATTR)).toBe(false)
    expect(cursor.el?.hasAttribute(PRESSED_ATTR)).toBe(false)
    expect(a.style.transition).not.toBe('')
    pointer(window, 'pointermove', 800, 600)
    settleFrames()
    await session.settled
    expect(a.style.translate).toBe('')
    expect(a.style.scale).toBe('')
    expect(a.style.transition).toBe('')
    expect(a.style.willChange).toBe('')
    session.release()
  })

  it('coalesces nested release and invalidation into one hit-test at the latest pointer', () => {
    a.click() // already queued before intent
    const first = cursor.suspendTargets()
    const second = cursor.suspendTargets()
    const hit = vi.spyOn(document, 'elementFromPoint').mockReturnValue(b)
    cursor.refresh()
    cursor.refresh()
    pointer(b, 'pointerover', 20, 30)
    pointer(window, 'pointermove', 900, 700)
    b.click()
    vi.advanceTimersByTime(20)
    expect(hit).not.toHaveBeenCalled()
    first.release()
    first.release()
    vi.advanceTimersByTime(20)
    expect(hit).not.toHaveBeenCalled()
    second.release()
    expect(hit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(hit).toHaveBeenCalledExactlyOnceWith(900, 700)
    expect(cursor.el?.hasAttribute(HIGHLIGHT_ATTR)).toBe(true)
  })

  it('publishes one departure so host-owned hover sessions release without hit-testing', () => {
    const derived = cursor.set({ hideNativeCursor: true, label: 'Target-owned' })
    const unrelated = cursor.loading()
    const leave = vi.fn(() => {
      derived.release()
      cursor.refresh()
    })
    cursor.on('target:leave', leave)
    const hit = vi.spyOn(document, 'elementFromPoint')
    const first = cursor.suspendTargets()
    const second = cursor.suspendTargets()
    expect(leave).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ element: a }))
    expect(document.documentElement.classList.contains(HTML_NO_NATIVE)).toBe(false)
    expect(cursor.el?.hasAttribute(LOADING_ATTR)).toBe(true)
    expect(cursor.el?.hasAttribute(MAGNETIC_ATTR)).toBe(false)
    expect(hit).not.toHaveBeenCalled()
    first.release()
    second.release()
    vi.advanceTimersByTime(20)
    expect(hit).toHaveBeenCalledTimes(1)
    unrelated.release()
  })

  it('shares the finite return with a lease acquired reentrantly from departure', async () => {
    let nested: ICursorTargetSession | undefined
    cursor.on('target:leave', () => {
      nested = cursor.suspendTargets()
    })
    const first = cursor.suspendTargets()
    const done = vi.fn()
    void nested?.settled.then(done)
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    settleFrames()
    await nested?.settled
    expect(done).toHaveBeenCalledOnce()
    expect(a.style.transition).toBe('')
    nested?.release()
    first.release()
  })

  it('does not revive stale crossing coordinates when the authoritative pointer is unavailable', () => {
    cursor.destroy()
    const media = fakeMedia(true)
    cursor.init()
    pointer(a, 'pointermove')
    pointer(a, 'pointerover')
    const session = cursor.suspendTargets()
    media.flip(false)
    const hit = vi.spyOn(document, 'elementFromPoint').mockReturnValue(a)
    session.release()
    vi.advanceTimersByTime(20)
    expect(hit).not.toHaveBeenCalled()
    expect(cursor.el?.hasAttribute(MAGNETIC_ATTR)).toBe(false)
    expect(cursor.el?.hasAttribute(HIGHLIGHT_ATTR)).toBe(false)
  })

  it('keeps explicit loading, state and live magnetism independently owned', async () => {
    const loading = cursor.loading()
    const state = cursor.set({ label: 'Owned' })
    const magnetic = cursor.magnetize({ getAnchor: () => ({ x: 100, y: 100 }) })
    const session = cursor.suspendTargets()
    settleFrames()
    await session.settled
    expect(cursor.el?.hasAttribute(LOADING_ATTR)).toBe(true)
    expect(cursor.el?.hasAttribute(MAGNETIC_ATTR)).toBe(true)
    expect(cursor.el?.textContent).toContain('Owned')
    session.release()
    loading.release()
    state.release()
    magnetic.release()
  })

  it('drops inferred drag and press without retaining an armed gesture', () => {
    a.setAttribute(DEFAULT_ATTRIBUTE, '{"drag":{"label":"Dragging"}}')
    cursor.destroy()
    cursor.init()
    pointer(a, 'pointerover')
    pointer(a, 'pointerdown', 20, 20)
    pointer(a, 'pointermove', 80, 80)
    expect(cursor.el?.hasAttribute(DRAGGING_ATTR)).toBe(true)
    cursor.suspendTargets()
    expect(cursor.el?.hasAttribute(DRAGGING_ATTR)).toBe(false)
    expect(cursor.el?.hasAttribute(PRESSED_ATTR)).toBe(false)
  })

  it('hides controlled presentation while preserving the host gesture for resume', () => {
    let phase: 'idle' | 'dragging' = 'dragging'
    const binding = cursor.bindDrag(a, { getState: () => phase })
    expect(cursor.el?.hasAttribute(DRAGGING_ATTR)).toBe(true)
    const session = cursor.suspendTargets()
    binding.refresh()
    expect(cursor.el?.hasAttribute(DRAGGING_ATTR)).toBe(false)
    expect(phase).toBe('dragging')
    session.release()
    vi.advanceTimersByTime(20)
    expect(cursor.el?.hasAttribute(DRAGGING_ATTR)).toBe(true)
    phase = 'idle'
    binding.refresh()
    binding.release()
  })

  it('finishes invisible returns on document hide without needing another frame', async () => {
    const session = cursor.suspendTargets()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    await session.settled
    expect(a.style.transition).toBe('')
  })

  it('finishes invisible returns when fine pointer input is disabled', async () => {
    cursor.destroy()
    const media = fakeMedia(true)
    cursor.init()
    pointer(a, 'pointermove')
    pointer(a, 'pointerover')
    const session = cursor.suspendTargets()
    media.flip(false)
    await session.settled
    expect(a.style.transition).toBe('')
  })

  it('resolves released and destroyed leases without affecting a later lifetime', async () => {
    const first = cursor.suspendTargets()
    first.release()
    await first.settled
    const old = cursor.suspendTargets()
    cursor.destroy()
    await old.settled
    cursor.init()
    const current = cursor.suspendTargets()
    old.release()
    const hit = vi.spyOn(document, 'elementFromPoint')
    cursor.refresh()
    vi.advanceTimersByTime(20)
    expect(hit).not.toHaveBeenCalled()
    current.release()
  })
})
