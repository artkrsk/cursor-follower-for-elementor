/** CSS keyword/cubic-bezier timing, evaluated without an animation-library clock. */
export function resolveEasing(value: string): (progress: number) => number {
  const keywords: Record<string, string> = {
    ease: '0.25,0.1,0.25,1',
    'ease-in': '0.42,0,1,1',
    'ease-out': '0,0,0.58,1',
    'ease-in-out': '0.42,0,0.58,1'
  }
  const raw = keywords[value.trim()] ?? /^cubic-bezier\(([^)]+)\)$/.exec(value.trim())?.[1]
  const points = raw?.split(',').map(Number)
  if (points?.length !== 4 || !points.every(Number.isFinite)) return (p) => p
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = points
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return (p) => p
  const sample = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t
  return (p) => {
    if (p <= 0 || p >= 1) return Math.max(0, Math.min(1, p))
    let low = 0
    let high = 1
    for (let i = 0; i < 24; i++) {
      const t = (low + high) / 2
      if (sample(t, x1, x2) < p) low = t
      else high = t
    }
    return sample((low + high) / 2, y1, y2)
  }
}
