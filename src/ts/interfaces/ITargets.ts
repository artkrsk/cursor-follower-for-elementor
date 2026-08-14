import type { ITargetContext } from './ITargetContext'
import type { ITargetEvents } from './ITargetEvents'

export interface ITargets {
  readonly current: ITargetContext | null
  on<E extends keyof ITargetEvents>(event: E, cb: ITargetEvents[E]): () => void
  /** Fed from the engine's single pointerdown/up listeners. */
  handleDown(): void
  handleUp(): void
  /**
   * Re-resolve whatever is hovered right now. For hosts whose own state
   * decides which rule applies: rules are otherwise resolved only when the
   * pointer crosses into an element, so a change under a still pointer went
   * unseen until it left and returned. Silent when nothing resolves
   * differently.
   */
  refresh(): void
}
