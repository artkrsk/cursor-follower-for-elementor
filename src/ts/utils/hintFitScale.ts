/**
 * Minimum cursor scale (a ratio of the base size) for the ring to fully contain
 * a box of the given size plus a px margin on every side — the diagonal is what
 * must fit inside the circle. Pure: the caller measures the hint, adds its own
 * padding to the box it passes, and keeps `margin` for clearance that is radial
 * by nature (the room an inside arrow pair reserves).
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
