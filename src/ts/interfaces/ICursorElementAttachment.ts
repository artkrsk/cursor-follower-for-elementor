import type { ICursorElementEvents } from './ICursorElementEvents'
import type { ICursorElementHideOptions } from './ICursorElementHideOptions'

export interface ICursorElementAttachment {
  readonly following: boolean
  pause(): void
  resume(): void
  hide(options?: ICursorElementHideOptions): void
  show(): void
  /** false preserves outgoing local DOM; external overlays are still removed. */
  destroy(revert?: boolean): void
  on<E extends keyof ICursorElementEvents>(event: E, cb: ICursorElementEvents[E]): () => void
}
