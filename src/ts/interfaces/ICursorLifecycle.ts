import type { ICursorFollower } from './ICursorFollower'

/** Internal boot ownership hooks, not part of the library constructor. */
export interface ICursorLifecycle {
  initialized(cursor: ICursorFollower): void
  destroying(cursor: ICursorFollower): void
}
