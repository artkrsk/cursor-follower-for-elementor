import type { IVec2 } from './IVec2'

/**
 * Per-element pull state the magnetic trap eases and writes: the current
 * inline translate (page px) plus the last written quantized pair, so
 * sub-precision steps dedupe to no DOM write. The controller preallocates one
 * for the active slot; each returning-queue entry carries its own.
 */
export interface IPullRecord {
  pull: IVec2
  lastX: number
  lastY: number
}
