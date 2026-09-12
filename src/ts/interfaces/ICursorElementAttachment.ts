import type { ICursorElementEvents } from './ICursorElementEvents'

export interface ICursorElementAttachment {
  readonly following: boolean
  pause(): void
  resume(): void
  hide(options?: { position?: 'home' | 'current' }): void
  show(): void
  /** false preserves outgoing local DOM; external overlays are still removed. */
  destroy(revert?: boolean): void
  on<E extends keyof ICursorElementEvents>(event: E, cb: ICursorElementEvents[E]): () => void
}
