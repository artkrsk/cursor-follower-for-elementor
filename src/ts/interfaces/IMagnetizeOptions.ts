import type { ICursorPayload } from './ICursorPayload'
import type { IVec2 } from './IVec2'

/** Programmatic magnetic trap with a live anchor (moving targets — sliders,
    scrubbed knobs). The caller owns the lifecycle: no hover coupling, no
    distance release, no element pull. */
export interface IMagnetizeOptions {
  /** Current anchor position in PAGE coordinates, read once per frame. */
  getAnchor: () => IVec2
  /** Pull strength toward the pointer. A number sets it for the session; a
      function is read once per frame (return 0 to glue rigidly to the anchor
      with no pointer strain — e.g. while dragging — null for the configured
      default). Defaults to options.magnetic.strength. */
  strength?: number | (() => number | null)
  /** Cursor state held for the duration (released with the session). */
  payload?: ICursorPayload
  /** Per-frame trailing override — return 1 to glue the cursor rigidly to
      the anchor (e.g. while dragging), null for the configured default. */
  trailing?: () => number | null
}
