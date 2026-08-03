/**
 * Minimum cursor scale (a ratio of the base size) for the ring to fully contain
 * a label of the given rendered box plus a px margin on every side — the
 * diagonal is what must fit inside the circle. Pure: the caller measures the
 * label and passes its width/height.
 */
export function hintFitScale(
  width: number,
  height: number,
  baseSize: number,
  margin: number
): number {
  if (baseSize <= 0) {
    return 0
  }
  return (Math.hypot(width, height) + 2 * margin) / baseSize
}
