import { DRAG_THRESHOLD_PX, DRAGGING_ATTR } from '../constants'
import type {
  ICursorPayload,
  IDragSessions,
  IEffectsSuite,
  ITargetContext,
  ITargets
} from '../interfaces'

/**
 * Mouse-drag adapter: turns a click-drag over a target that declares a `drag`
 * payload into a pushed/popped session, so the cursor swaps for the drag's
 * duration and drops back on release. A pure observer — it reads pointer events
 * fanned from the engine's single, passive pointer path, so it never
 * preventDefaults or captures and can't fight the dragged element's own handling
 * (e.g. Swiper). The session is the hover state merged with its `drag` diff,
 * snapshotted at press — self-contained, because the tracked hover CLEARS when the
 * pointer leaves the element mid-drag, so the drag cursor has to carry its own
 * state (the one under the press), not lean on the live hover. When the drag
 * releases, the suppressed hover has to resync to whatever the pointer is over
 * now — handleUp hands that decision to `onDragEnd` with the current target.
 */

/** Max-axis travel from the press point — the click-vs-drag decision. Pure. */
export const exceedsThreshold = (dx: number, dy: number, min: number): boolean =>
  Math.abs(dx) >= min || Math.abs(dy) >= min

export function createDragSessions(args: {
  suite: IEffectsSuite
  targets: ITargets
  root: HTMLElement
  /** Called after a drag's session releases, with the target under the pointer
      (null outside every target) — the resync for the hover updates the drag
      suppressed. Never fires for a plain click. */
  onDragEnd: (ctx: ITargetContext | null) => void
}): IDragSessions {
  const { suite, targets, root } = args

  let armed: { startX: number; startY: number; payload: ICursorPayload } | null = null
  let release: (() => void) | null = null

  return {
    get isDragging() {
      return release !== null
    },
    handleDown(e) {
      // Primary button only. Snapshot the hover state merged with its `drag` diff
      // so the pushed session stands alone once the hover clears mid-drag.
      if (e.button !== 0) {
        return
      }
      const payload = targets.current?.payload
      const drag = payload?.drag
      if (payload && drag) {
        armed = { startX: e.clientX, startY: e.clientY, payload: { ...payload, ...drag } }
      }
    },
    handleMove(e) {
      if (!armed || release) {
        return
      }
      if (exceedsThreshold(e.clientX - armed.startX, e.clientY - armed.startY, DRAG_THRESHOLD_PX)) {
        release = suite.addSession(armed.payload)
        root.setAttribute(DRAGGING_ATTR, '')
      }
    },
    handleUp() {
      const wasDragging = release !== null
      if (release) {
        release()
        release = null
        root.removeAttribute(DRAGGING_ATTR)
      }
      armed = null
      // After the session is released, so the resync recomputes on top of the
      // restored layers — same order the composition root used to apply.
      if (wasDragging) {
        args.onDragEnd(targets.current)
      }
    }
  }
}
