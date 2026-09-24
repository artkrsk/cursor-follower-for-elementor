import { DRAGGING_ATTR } from '../constants'
import type { ICursorDragOptions, IEffectsSuite, ITargetContext, ITargets } from '../interfaces'
import type { TCursorDragState } from '../types'

/** Presentation only: the host owns every acceptance, axis and terminal decision. */
export function createControlledDrag(args: {
  suite: IEffectsSuite
  targets: ITargets
  root: HTMLElement
  canEngage: () => boolean
  resync: () => void
  resetMagneticPress: () => void
}) {
  const { suite, targets, root } = args
  const bindings = new Map<Element, ICursorDragOptions>()
  let owner: ITargetContext | null = null
  let painted: ITargetContext | null = null
  let phase: TCursorDragState | null = null
  let enabled = true
  let disposed = false
  let suspended = false

  const stateOf = (ctx: ITargetContext): TCursorDragState =>
    enabled ? (bindings.get(ctx.element)?.getState() ?? 'unavailable') : 'unavailable'
  const controlled = (ctx: ITargetContext | null): ctx is ITargetContext =>
    ctx !== null && (ctx.payload?.dragMode === 'controlled' || bindings.has(ctx.element))

  const paint = (ctx: ITargetContext, state: TCursorDragState) => {
    if (painted === ctx && phase === state) return
    painted = ctx
    phase = state
    suite.setPressed(false)
    args.resetMagneticPress()
    root.toggleAttribute(DRAGGING_ATTR, state === 'dragging')
    if (state === 'rejected' || state === 'unavailable') {
      suite.setHover({}, null)
      return
    }
    const payload = ctx.payload ?? {}
    if (state === 'dragging') {
      // The drag template supersedes the press template while the press dot stays held.
      const { press: _press, ...base } = payload
      suite.setHover({ ...base, ...payload.drag }, ctx.element)
    } else {
      suite.setHover(payload, ctx.element)
    }
    if (state === 'pressed' || state === 'dragging') suite.setPressed(true)
  }

  const refresh = () => {
    if (disposed || suspended || !args.canEngage()) return
    if (owner) {
      const next = bindings.get(owner.element)?.getState() ?? 'unavailable'
      if (next !== 'idle' && next !== 'unavailable') {
        paint(owner, enabled ? next : 'unavailable')
        return
      }
      owner = null
      clear()
      args.resync()
      return
    }
    const ctx = targets.current
    if (!controlled(ctx)) return
    const state = stateOf(ctx)
    if (state === 'pressed' || state === 'dragging' || state === 'rejected') owner = ctx
    paint(ctx, state)
  }
  const clear = () => {
    suite.setPressed(false)
    args.resetMagneticPress()
    root.removeAttribute(DRAGGING_ATTR)
    painted = null
    phase = null
  }

  return {
    get active() {
      return owner !== null
    },
    enter(ctx: ITargetContext): boolean {
      if (suspended || !controlled(ctx)) return false
      const state = stateOf(ctx)
      if (state === 'pressed' || state === 'dragging' || state === 'rejected') owner = ctx
      paint(ctx, state)
      return true
    },
    leave() {
      if (painted && !owner) clear()
    },
    handleDown(): boolean {
      if (owner) {
        refresh()
        return true
      }
      const ctx = targets.current
      if (!controlled(ctx)) return false
      refresh()
      return true
    },
    handleUp(): boolean {
      if (!owner && !painted) return false
      // A raw release may belong to another pointer. Only the host ends its gesture.
      if (owner) refresh()
      else {
        clear()
        args.resync()
      }
      return true
    },
    refresh,
    setSuspended(value: boolean) {
      suspended = value
      if (value) clear()
      // The caller resumes through a coalesced target refresh, not a stale owner paint.
    },
    setEnabled(value: boolean) {
      enabled = value
      refresh()
    },
    bind(target: Element, options: ICursorDragOptions) {
      bindings.set(target, options)
      refresh()
      let released = false
      return {
        refresh() {
          if (!released) refresh()
        },
        release() {
          if (released || disposed) return
          released = true
          if (bindings.get(target) !== options) return
          bindings.delete(target)
          if (owner?.element === target || painted?.element === target) {
            owner = null
            clear()
            args.resync()
          }
        }
      }
    },
    dispose() {
      disposed = true
      bindings.clear()
      owner = null
      clear()
    }
  }
}
