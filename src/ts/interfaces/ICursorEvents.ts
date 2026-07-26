import type { ITargetContext } from './ITargetContext'

export interface ICursorEvents {
  'target:enter': (ctx: ITargetContext) => void
  /** Carries the context that was just left. */
  'target:leave': (ctx: ITargetContext) => void
  'enabled:change': (enabled: boolean) => void
}
