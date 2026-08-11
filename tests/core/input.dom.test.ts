// @vitest-environment happy-dom

import { createPointerInput } from '@ts/core/input'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeMedia } from '../support'

/**
 * The media query owns the listener lifecycle, which is the whole reason this
 * module exists — a hybrid device that switches between a trackpad and touch
 * has to attach and detach at runtime.
 *
 * happy-dom's real MediaQueryList cannot be flipped, so window.matchMedia is
 * replaced with the fakeMedia stub whose `change` a test fires on demand. That
 * is also the only way to reach the disabled path at all: happy-dom reports
 * `(hover:hover) and (pointer:fine)` as matching, so the engine always boots
 * enabled otherwise.
 */

const pointer = (type: string, over: Record<string, unknown> = { pointerType: 'mouse' }) => {
  const event = new Event(type, { bubbles: true })
  for (const [key, value] of Object.entries(over)) {
    Object.defineProperty(event, key, { value })
  }
  window.dispatchEvent(event)
}

let lifecycle: AbortController

const setup = (matches = true) => {
  const media = fakeMedia(matches)
  const handlers = {
    onMove: vi.fn(),
    onDown: vi.fn(),
    onUp: vi.fn(),
    onEnabledChange: vi.fn()
  }
  const input = createPointerInput({ signal: lifecycle.signal, ...handlers })
  return { input, media, ...handlers }
}

beforeEach(() => {
  lifecycle = new AbortController()
})

afterEach(() => {
  lifecycle.abort()
})

describe('the media query gate', () => {
  it('attaches when the query matches at construction', () => {
    const { input, onMove } = setup(true)

    pointer('pointermove')

    expect(input.enabled).toBe(true)
    expect(onMove).toHaveBeenCalledOnce()
  })

  it('stays detached when it does not match', () => {
    const { input, onMove } = setup(false)

    pointer('pointermove')

    expect(input.enabled).toBe(false)
    expect(onMove).not.toHaveBeenCalled()
  })

  /** The construction-time apply passes notify=false: the composition root sets
      the document classes itself right after, and an event before the caller
      has wired up would be announcing a state nobody changed. */
  it('does not announce the state it booted in', () => {
    const { onEnabledChange } = setup(true)

    expect(onEnabledChange).not.toHaveBeenCalled()
  })

  it('detaches and announces when the device stops being fine-pointer', () => {
    const { input, media, onMove, onEnabledChange } = setup(true)

    media.flip(false)
    pointer('pointermove')

    expect(input.enabled).toBe(false)
    expect(onMove).not.toHaveBeenCalled()
    expect(onEnabledChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('re-attaches when it becomes fine-pointer again', () => {
    const { input, media, onMove, onEnabledChange } = setup(false)

    media.flip(true)
    pointer('pointermove')

    expect(input.enabled).toBe(true)
    expect(onMove).toHaveBeenCalledOnce()
    expect(onEnabledChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  /** Guards against stacking a second listener set on a redundant change — a
      doubled set would deliver every pointer event twice. */
  it('does not stack listeners when it is told to attach twice', () => {
    const { media, onMove } = setup(true)

    media.flip(true)
    pointer('pointermove')

    expect(onMove).toHaveBeenCalledOnce()
  })

  it('detaches when the lifecycle is aborted', () => {
    const { input, onMove } = setup(true)

    lifecycle.abort()
    pointer('pointermove')

    expect(input.enabled).toBe(false)
    expect(onMove).not.toHaveBeenCalled()
  })
})

describe('the pointer-type gate', () => {
  it('accepts a mouse', () => {
    const { onMove } = setup()

    pointer('pointermove', { pointerType: 'mouse' })

    expect(onMove).toHaveBeenCalledOnce()
  })

  it('accepts a pen', () => {
    const { onMove } = setup()

    pointer('pointermove', { pointerType: 'pen' })

    expect(onMove).toHaveBeenCalledOnce()
  })

  /** Touch never reaches the engine, even on a hybrid device whose media query
      matches because a mouse is also attached. */
  it('rejects touch', () => {
    const { onMove } = setup()

    pointer('pointermove', { pointerType: 'touch' })

    expect(onMove).not.toHaveBeenCalled()
  })
})

describe('the event sources', () => {
  /** pointerover is a position source too — it carries coordinates on page
      entry and, in Chromium and Safari, on hover recomputation under a resting
      pointer (w3c/pointerevents#529) — the earliest the cursor can be revealed. */
  it('treats pointerover as a move', () => {
    const { onMove } = setup()

    pointer('pointerover')

    expect(onMove).toHaveBeenCalledOnce()
  })

  it('routes press and release', () => {
    const { onDown, onUp } = setup()

    pointer('pointerdown')
    pointer('pointerup')

    expect(onDown).toHaveBeenCalledOnce()
    expect(onUp).toHaveBeenCalledOnce()
  })

  it('applies the pointer-type gate to press and release too', () => {
    const { onDown, onUp } = setup()

    pointer('pointerdown', { pointerType: 'touch' })
    pointer('pointerup', { pointerType: 'touch' })

    expect(onDown).not.toHaveBeenCalled()
    expect(onUp).not.toHaveBeenCalled()
  })

  /** A cancelled pointer (rare on mouse) must end the press like a release —
      otherwise the pressed scale and an active drag stick until the next click. */
  it('routes a cancelled pointer to the release handler', () => {
    const { onUp } = setup()

    pointer('pointercancel')

    expect(onUp).toHaveBeenCalledOnce()
  })

  it('applies the pointer-type gate to a cancel too', () => {
    const { onUp } = setup()

    pointer('pointercancel', { pointerType: 'touch' })

    expect(onUp).not.toHaveBeenCalled()
  })
})
