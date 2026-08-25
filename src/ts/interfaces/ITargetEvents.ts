import type { ITargetContext } from './ITargetContext'

/** Target-tracker events. `leave` carries the context that was just left. */
export interface ITargetEvents {
  enter: (ctx: ITargetContext) => void
  leave: (ctx: ITargetContext) => void
  press: (ctx: ITargetContext) => void
  release: (ctx: ITargetContext) => void
  /** The held target survived a re-resolve — page state may have changed
      under it, so anything derived from the element should be re-read. */
  refresh: (ctx: ITargetContext) => void
}
