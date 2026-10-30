import type { TCursorObserver } from '../types/TCursorObserver'
import type { ICursorFollower } from './ICursorFollower'
import type { ICursorObserveOptions } from './ICursorObserveOptions'

/** The discovery global (`window.artsCursor`) — installed by the inline gate at
    parse time, or by the app when no gate ran — importable so consumers type the
    window key from one source instead of copying structural shapes. */
export interface IArtsCursorGlobal {
  /** Resolves at the first engine init. Never settles where the gate does not
      load the engine (touch-only devices). */
  ready: Promise<ICursorFollower>
  get(): ICursorFollower | null
  /** Replays the initialized instance (including capability-disabled cursors),
      or null. Null is published before provider teardown. */
  observe(listener: TCursorObserver, options?: ICursorObserveOptions): () => void
  version: string
}
