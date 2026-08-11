import type { IGeometryEntry } from './IGeometryEntry'

export interface IGeometryCache {
  /** Cached entry, or a one-time synchronous measure on a cold element. */
  resolve(el: Element): IGeometryEntry
  /** Continuous flush-free measurement (IO re-observe loop, ~frame cadence)
      while the returned stop function hasn't been called — for anchors that
      animate while engaged. One-frame latency, absorbed by the lerp. */
  stream(el: Element): () => void
  /** Batch-measure the marked elements at idle. */
  warm(els: Iterable<Element>): void
  dispose(): void
}
