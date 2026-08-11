import type { IArtsCursorGlobal, ICursorFollower } from './interfaces'
import type { TBootOptions, TGateBoot, TKitSettings } from './types'

/**
 * Consumer-facing discovery contract. Consumers with an npm reference to
 * this package type their own Window declaration via
 * `import type { IArtsCursorGlobal } from '@arts/cursor-follower'`.
 */
declare global {
  interface Window {
    artsCursor?: IArtsCursorGlobal
    /** Read once by boot.ts. See TBootOptions for why the injectables are absent. */
    artsCursorFollowerOptions?: TBootOptions
    /** Read by gate.ts at parse and at load time. Absent outside WordPress
        (the docs site never sets it). */
    artsCursorFollowerBoot?: TGateBoot
  }

  interface WindowEventMap {
    /** Elementor editor bridge: kit settings forwarded into the preview window. */
    'arts-cursor:kit-change': CustomEvent<{ settings?: TKitSettings }>
  }

  interface DocumentEventMap {
    /** Announced once the engine is live — load-order-proof discovery. */
    'arts-cursor:ready': CustomEvent<ICursorFollower>
  }
}
