import type { ICursorFollower } from './ICursorFollower'

export interface ICursorApp {
  /** Starts after DOM readiness and replaces the previous provider owner. */
  init(): void
  /** Permanently retires this owner, including pending initialization. */
  destroy(): void
  get(): ICursorFollower | null
  readonly signal: AbortSignal
}
