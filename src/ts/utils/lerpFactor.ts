import { FRAME_60 } from '../constants'

/**
 * Frame-rate-corrected exponential smoothing: the fraction of the remaining
 * distance to cover this frame, for a `rate` expressed per 60 Hz frame. Pure —
 * module scope so it stays inlinable on the frame path.
 */
export const lerpFactor = (rate: number, dt: number): number =>
  rate >= 1 ? 1 : 1 - (1 - rate) ** (dt / FRAME_60)
