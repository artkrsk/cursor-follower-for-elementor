import { DRAG_THRESHOLD_PX } from '@ts/constants'
import { createDragSessions, exceedsThreshold } from '@ts/interaction/dragSessions'
import type { ICursorPayload, IEffectsSuite, ITargets } from '@ts/interfaces'
import { describe, expect, it, vi } from 'vitest'

/**
 * The adapter is a pure state machine over pointer events — no DOM, no
 * listeners of its own. The suite is a `{ addSession }` returning a spy release,
 * targets is a swappable `current`, and root is a `{ setAttribute }` stub.
 */

const ptr = (over: Partial<PointerEvent> = {}): PointerEvent =>
  ({ button: 0, clientX: 0, clientY: 0, ...over }) as PointerEvent

/** A realistic hover: a "Drag" pill whose drag diff only swaps the label. */
const dragDiff: ICursorPayload = { label: '← Drag →' }
const hover: ICursorPayload = { shape: 'pill', label: 'Drag', drag: dragDiff }

const setup = (payload: ICursorPayload = hover) => {
  const release = vi.fn()
  const suite = { addSession: vi.fn(() => release) } as unknown as IEffectsSuite
  const targets = { current: { element: {} as Element, payload } } as unknown as ITargets
  const root = { setAttribute: vi.fn(), removeAttribute: vi.fn() } as unknown as HTMLElement
  const onDragEnd = vi.fn()
  return {
    suite,
    targets,
    root,
    release,
    onDragEnd,
    adapter: createDragSessions({ suite, targets, root, onDragEnd })
  }
}

describe('exceedsThreshold', () => {
  it('crosses on either axis alone — max-axis, not Euclidean', () => {
    expect(exceedsThreshold(4, 0, 4)).toBe(true)
    expect(exceedsThreshold(0, -4, 4)).toBe(true)
    // Euclidean would be ~4.24 ≥ 4; max-axis says no.
    expect(exceedsThreshold(3, 3, 4)).toBe(false)
  })
})

describe('createDragSessions', () => {
  /** Self-contained: hover's shape + the diff's label, so it survives the hover
      clearing when the pointer leaves the element mid-drag. */
  it('pushes the hover state merged with the drag diff at the threshold', () => {
    const { adapter, suite, root } = setup()

    adapter.handleDown(ptr({ clientX: 10, clientY: 10 }))
    adapter.handleMove(ptr({ clientX: 10 + DRAG_THRESHOLD_PX, clientY: 10 }))

    expect(suite.addSession).toHaveBeenCalledWith(
      expect.objectContaining({ shape: 'pill', label: '← Drag →' })
    )
    expect(root.setAttribute).toHaveBeenCalledWith('data-cursor-dragging', '')
  })

  it('releases the session and clears the flag on release', () => {
    const { adapter, release, root } = setup()
    adapter.handleDown(ptr())
    adapter.handleMove(ptr({ clientX: DRAG_THRESHOLD_PX }))

    adapter.handleUp()

    expect(release).toHaveBeenCalledTimes(1)
    expect(root.removeAttribute).toHaveBeenCalledWith('data-cursor-dragging')
  })

  it('reports isDragging only while a session is held', () => {
    const { adapter } = setup()

    expect(adapter.isDragging).toBe(false)
    adapter.handleDown(ptr())
    expect(adapter.isDragging).toBe(false) // armed, still below threshold
    adapter.handleMove(ptr({ clientX: DRAG_THRESHOLD_PX }))
    expect(adapter.isDragging).toBe(true)
    adapter.handleUp()
    expect(adapter.isDragging).toBe(false)
  })

  it('treats a sub-threshold press as a click — no session', () => {
    const { adapter, suite } = setup()

    adapter.handleDown(ptr())
    adapter.handleMove(ptr({ clientX: DRAG_THRESHOLD_PX - 1 }))
    adapter.handleUp()

    expect(suite.addSession).not.toHaveBeenCalled()
  })

  it('never arms over a target without a drag payload', () => {
    const { adapter, suite } = setup({ shape: 'pill', label: 'Static' })

    adapter.handleDown(ptr())
    adapter.handleMove(ptr({ clientX: 100 }))

    expect(suite.addSession).not.toHaveBeenCalled()
  })

  it('ignores a non-primary button', () => {
    const { adapter, suite } = setup()

    adapter.handleDown(ptr({ button: 2 }))
    adapter.handleMove(ptr({ clientX: 100 }))

    expect(suite.addSession).not.toHaveBeenCalled()
  })

  /** The resync for the hover updates the drag suppressed: released AFTER the
      session pops, with whatever the pointer is over now. */
  it('hands the drag end to onDragEnd with the target under the pointer', () => {
    const { adapter, targets, release, onDragEnd } = setup()
    adapter.handleDown(ptr())
    adapter.handleMove(ptr({ clientX: DRAG_THRESHOLD_PX }))

    adapter.handleUp()

    expect(onDragEnd).toHaveBeenCalledExactlyOnceWith(targets.current)
    // Session release first, resync second — the resync recomputes on top of
    // the restored layers.
    expect(release.mock.invocationCallOrder[0]).toBeLessThan(
      onDragEnd.mock.invocationCallOrder[0] as number
    )
  })

  it('never fires onDragEnd for a plain click', () => {
    const { adapter, onDragEnd } = setup()

    adapter.handleDown(ptr())
    adapter.handleUp()

    expect(onDragEnd).not.toHaveBeenCalled()
  })

  /** `current` clears mid-drag (pointer left the element); the press-time
      snapshot is what gets sessioned. */
  it('sessions the state snapshotted at press, not whatever is current later', () => {
    const { adapter, suite, targets } = setup()

    adapter.handleDown(ptr())
    ;(targets as { current: unknown }).current = null
    adapter.handleMove(ptr({ clientX: 100 }))

    expect(suite.addSession).toHaveBeenCalledWith(
      expect.objectContaining({ shape: 'pill', label: '← Drag →' })
    )
  })
})
