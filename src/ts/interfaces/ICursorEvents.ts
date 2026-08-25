import type { ITargetContext } from './ITargetContext'

export interface ICursorEvents {
  'target:enter': (ctx: ITargetContext) => void
  /** Carries the context that was just left. */
  'target:leave': (ctx: ITargetContext) => void
  /** A refresh — manual or the automatic post-click one — re-resolved the
      SAME target. Anything a host derived from the element at enter time
      (a computed colour, a measured state) may be stale: re-read it. */
  'target:refresh': (ctx: ITargetContext) => void
  'enabled:change': (enabled: boolean) => void
}
