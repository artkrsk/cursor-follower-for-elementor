export interface ITransformWriter {
  setTranslate(x: number, y: number): void
  /** Folds the elastic squash and its counter-rotation into one symmetric
      matrix on the root — a = sx·cos² + sy·sin², d = sx·sin² + sy·cos²,
      b = c = (sx − sy)·sin·cos — composed after translate; no child element
      is written. `cos`/`sin` must be a unit direction vector. Contract: never
      called near zero lag (the elastic model settles below SETTLE_EPS
      first), so an ill-defined direction is unreachable by construction. */
  setElastic(scaleX: number, scaleY: number, cos: number, sin: number): void
  /** Exact identity — equivalent to setElastic(1, 1, 1, 0), no rounding drift. */
  resetElastic(): void
  /** Commit the accumulated translate + matrix as one write. setTranslate and
      setElastic only mark state dirty; the pipeline calls this once per frame, so
      a frame that changes both still costs a single style commit. No-op when
      nothing changed — an idle-but-subscribed frame writes nothing. */
  flush(): void
}
