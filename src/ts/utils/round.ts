/**
 * Frame-path write granularity: positions quantize to 0.1px (round1), matrix
 * components to 0.001 (round3). Writers compare the quantized value against
 * the last one written, so sub-precision deltas dedupe to no DOM write at all.
 */
export const round1 = (v: number): number => Math.round(v * 10) / 10
export const round3 = (v: number): number => Math.round(v * 1000) / 1000
