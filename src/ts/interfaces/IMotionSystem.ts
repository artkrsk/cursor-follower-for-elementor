/**
 * The frame path as one unit: transform writer, elastic model, lerp pipeline
 * driven by the shared frame coordinator. Its demand ends on convergence.
 */
export interface IMotionSystem {
  readonly active: boolean
  /** Sample caller-owned values before any engine frame writes. */
  measure(): void
  /** Advance and render from the sampled values. */
  frame(dt: number): void
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
