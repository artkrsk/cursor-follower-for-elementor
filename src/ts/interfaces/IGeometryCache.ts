import type { IGeometryEntry } from './IGeometryEntry'

export interface IGeometryCache {
  /** Cached entry, or a one-time synchronous measure on a cold element. */
  resolve(el: Element): IGeometryEntry
  /** Unconditional synchronous measure — engage-time reads must not trust the
      cache: a fixed or stuck-sticky element's page coordinates move with
      scroll, so a cached entry can be stale by the whole scroll delta (sticky
      headers). One layout read; reserved for rare moments, never the hot
      hover path. */
  measure(el: Element): IGeometryEntry
  /** Continuous flush-free measurement (IO re-observe loop, ~frame cadence)
      while the returned stop function hasn't been called — for anchors that
      animate while engaged. One-frame latency, absorbed by the lerp. */
  stream(el: Element): () => void
  /** Batch-measure the marked elements at idle. */
  warm(els: Iterable<Element>): void
  dispose(): void
}
