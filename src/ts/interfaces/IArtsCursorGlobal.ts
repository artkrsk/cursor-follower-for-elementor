import type { ICursorFollower } from './ICursorFollower'

/** The discovery global installed by the plugin boot script
    (`window.artsCursor`) — importable so consumers type the window key
    from one source instead of copying structural shapes. */
export interface IArtsCursorGlobal {
  /** Resolves at engine init (i.e. whenever the plugin is active and the
      boot script runs). */
  ready: Promise<ICursorFollower>
  get(): ICursorFollower | null
  version: string
}
