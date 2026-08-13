import type { TStyledElement } from '../types/TStyledElement'
import type { IGeometryEntry } from './IGeometryEntry'
import type { IVec2 } from './IVec2'

export interface IMagneticController {
  readonly engaged: boolean
  /** Engaged, or the element is still easing back to rest. */
  readonly busy: boolean
  /** Element mode: live entry anchor + element pull + distance release.
      `zone` is the hover zone's rect (the trigger element, before anchor
      redirection): inside it the trap never distance-releases — the hover
      boundary owns release there; absent, the radius alone governs.
      `elementScale` is the resting shrink for this engagement, already
      normalized: null writes no inline `scale`. */
  engage(
    el: TStyledElement,
    strength: number,
    entry: IGeometryEntry,
    zone?: IGeometryEntry,
    elementScale?: number | null
  ): void
  /** Live mode: caller-owned anchor callback (PAGE coords), no pull, no
      distance release. `getStrength` is read once per frame (0 glues the ring
      rigidly to the anchor). */
  engageLive(getAnchor: () => IVec2, getStrength: () => number): void
  release(): void
  /** Click-scale ratio while the primary button is down (null lifts it). The
      engaged element mirrors it as an inline `scale`, eased by the same
      animation tokens as the ring — so the pair shrinks as one. Rides the
      engagement: releasing the trap hands the scale back regardless. */
  setPressedScale(ratio: number | null): void
  /** Advances the element pull (and release-return). Every frame. */
  tick(dt: number): void
  /** Page-space target composition; false when not engaged (free-roam). */
  composeTarget(): boolean
  dispose(): void
}
