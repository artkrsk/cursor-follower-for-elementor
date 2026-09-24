// @vitest-environment happy-dom

import { CLEAR_DELAY_PAD_MS, LOADING_OUT_ATTR, SPINNER_ACTIVE_ATTR } from '@ts/constants'
import { createCursor } from '@ts/core/createCursor'
import { createSpinnerActivity } from '@ts/effects/spinnerActivity'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeTicker } from '../support'

let root: HTMLElement
let spinner: Element
let activity: ReturnType<typeof createSpinnerActivity>
const end = (target: Element, propertyName: string, type = 'transitionend') => {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'propertyName', { value: propertyName })
  target.dispatchEvent(event)
}
beforeEach(() => {
  vi.useFakeTimers()
  root = document.createElement('div')
  root.innerHTML = '<svg class="arts-cursor__spinner"><circle/></svg>'
  spinner = root.firstElementChild as Element
  activity = createSpinnerActivity(root, () => 0.25)
  activity.start()
})
afterEach(() => {
  activity.stop()
  vi.useRealTimers()
})

describe('spinner activity', () => {
  it('stops spinner paint at scale collapse while the ring restore tail remains', () => {
    const cursor = createCursor({ ticker: fakeTicker().adapter })
    cursor.init()
    try {
      const loading = cursor.loading()
      expect(cursor.el?.hasAttribute(SPINNER_ACTIVE_ATTR)).toBe(true)
      vi.advanceTimersByTime(1000)
      loading.release()
      expect(cursor.el?.hasAttribute(LOADING_OUT_ATTR)).toBe(true)
      const spinner = cursor.el?.querySelector('.arts-cursor__spinner') as Element
      const event = new Event('transitionend', { bubbles: true })
      Object.defineProperty(event, 'propertyName', { value: 'scale' })
      spinner.dispatchEvent(event)
      expect(cursor.el?.hasAttribute(SPINNER_ACTIVE_ATTR)).toBe(false)
      expect(cursor.el?.hasAttribute(LOADING_OUT_ATTR)).toBe(true)
    } finally {
      cursor.destroy()
    }
  })

  it('stops on the spinner scale completion, ignoring other properties and child events', () => {
    activity.collapse()
    end(spinner, 'opacity')
    end(spinner.firstElementChild as Element, 'scale')
    end(spinner, 'scale', 'transitioncancel')
    expect(root.hasAttribute(SPINNER_ACTIVE_ATTR)).toBe(true)
    end(spinner, 'scale')
    expect(root.hasAttribute(SPINNER_ACTIVE_ATTR)).toBe(false)
  })
  it('falls back to the collapse duration when no transition event arrives', () => {
    activity.collapse()
    vi.advanceTimersByTime(250 + CLEAR_DELAY_PAD_MS)
    expect(root.hasAttribute(SPINNER_ACTIVE_ATTR)).toBe(false)
  })
  it('cannot stop a new loading entry from a previous exit completion', () => {
    activity.collapse()
    activity.start()
    end(spinner, 'scale')
    vi.advanceTimersByTime(1000)
    expect(root.hasAttribute(SPINNER_ACTIVE_ATTR)).toBe(true)
  })
  it('stops immediately for zero-duration exits', () => {
    activity.stop()
    activity = createSpinnerActivity(root, () => 0)
    activity.start()
    activity.collapse()
    expect(root.hasAttribute(SPINNER_ACTIVE_ATTR)).toBe(false)
  })
})
