import type { IArtsCursorGlobal } from './IArtsCursorGlobal'
import type { ICursorFollower } from './ICursorFollower'

/** The gate-era shape of `window.artsCursor`: the public contract plus the
    pending-`ready` resolver. boot.ts claims the resolver and replaces the
    global with the engine-backed object, so this shape exists only between
    gate parse and engine init. */
export interface IGateGlobal extends IArtsCursorGlobal {
  /** Claimed (and thereby retired) by boot.ts. */
  /** Shared by the separately bundled gate and engine; never replace this hub. */
  __publish(cursor: ICursorFollower | null): void
  __disposeBoot?: () => void
  __replaceBoot(install: () => void): void
}
