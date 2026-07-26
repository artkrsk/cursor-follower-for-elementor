import type { ITargetContext } from './ITargetContext'
import type { ITargetEvents } from './ITargetEvents'

export interface ITargets {
  readonly current: ITargetContext | null
  on<E extends keyof ITargetEvents>(event: E, cb: ITargetEvents[E]): () => void
  /** Fed from the engine's single pointerdown/up listeners. */
  handleDown(): void
  handleUp(): void
}
