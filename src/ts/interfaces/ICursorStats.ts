export interface ICursorStats {
  /** Cursor measurement + motion cost in ms — a
      dev-only diagnostic. Reads 0 in the shipped bundle; don't build on it. */
  frameMs: number
  /** Main-cursor motion demand, not the shared ticker's subscription state. */
  active: boolean
  /** |target − follower| in px — how far the follower trails its target. The
      elastic drive, and useful for tuning readouts. */
  lag: number
}
