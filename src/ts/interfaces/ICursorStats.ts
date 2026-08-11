export interface ICursorStats {
  /** Per-frame cost of the frame path, in ms — a dev-only diagnostic, measured
      only in dev builds. Reads 0 in the shipped bundle; don't build on it. */
  frameMs: number
  active: boolean
  /** |target − follower| in px — how far the follower trails its target. The
      elastic drive, and useful for tuning readouts. */
  lag: number
}
