import type { IArtsCursorGlobal } from './IArtsCursorGlobal'
import type { ICursorFollower } from './ICursorFollower'

/** Shared discovery hub for separately bundled gates and apps. */
export interface IGateGlobal extends IArtsCursorGlobal {
  __publish(cursor: ICursorFollower | null): void
  __disposeBoot?: () => void
  __disposeGate?: () => void
  __replaceBoot(install: () => void): void
}
