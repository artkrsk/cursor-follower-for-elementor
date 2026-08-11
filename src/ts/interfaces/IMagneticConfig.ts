export interface IMagneticConfig {
  /** Pull toward the pointer, 0–1 — 0 glues the cursor rigidly to the anchor. */
  strength: number
  /** Pointer distance from the anchor, in px, that ends an element engagement. */
  releaseRadius: number
}
