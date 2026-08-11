/**
 * The frame path as one unit: transform writer, elastic model, lerp pipeline
 * and the ticker subscription. The loop only runs while it has something to
 * do — it unsubscribes on convergence and re-arms on pointer activity.
 */
export interface IMotionSystem {
  /** Initial paint at the composed target (viewport centre). */
  snap(): void
  /** Materialize at the pointer: every vector to (x, y), painted — no glide-in. */
  snapTo(x: number, y: number): void
  /** New pointer position; wakes the loop. */
  setPointer(x: number, y: number): void
  wake(): void
  sleep(): void
  dispose(): void
}
