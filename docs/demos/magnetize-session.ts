import type { ICursorSession } from '@engine'

let session: ICursorSession | null = null

export function engageOrbit(): void {
  if (session) {
    return
  }
  const dot = document.querySelector('.demo-orbit-dot')
  if (!dot) {
    return
  }
  session =
    window.artsCursor?.get()?.magnetize({
      // Page coordinates, read once per frame — the dot is mid-animation.
      getAnchor: () => {
        const r = dot.getBoundingClientRect()
        return {
          x: r.left + r.width / 2 + window.scrollX,
          y: r.top + r.height / 2 + window.scrollY
        }
      },
      payload: { scale: '44px' },
      // Near-zero strain keeps the ring centered on the dot instead of
      // straining toward the pointer.
      strength: () => 0.05
    }) ?? null
}

export function releaseOrbit(): void {
  session?.release()
  session = null
}
