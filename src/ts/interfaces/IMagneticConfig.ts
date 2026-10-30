export interface IMagneticConfig {
  /** Pull toward the pointer, 0–1 — 0 glues the cursor rigidly to the anchor. */
  strength: number
  /** Pointer distance from the anchor, in px, that ends an element engagement.
      A floor: an engagement entered with the pointer already farther out widens
      its own threshold instead of releasing at once. */
  releaseRadius: number
  /** Resting scale of the engaged ELEMENT itself, from its centre. 1 leaves the
      element's own CSS alone; a payload's `elementScale` overrides it per target. */
  elementScale: number
}
