import type { IFrameState } from '../interfaces'

export function createFrameState(): IFrameState {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const sx = window.scrollX
  const sy = window.scrollY
  return {
    mouseClient: { x: cx, y: cy },
    scroll: { x: sx, y: sy },
    target: { x: cx + sx, y: cy + sy },
    follower: { x: cx + sx, y: cy + sy },
    lag: { x: 0, y: 0 },
    pointerSeen: false
  }
}

/**
 * Keeps `state.scroll` current by sampling `window` on a passive scroll listener,
 * seeded once. `window` is still the only source — `interaction/geometry.ts`
 * derives page coordinates as `rect + window.scroll`, so anything else could only
 * disagree with the geometry cache. This changes *when* the sample is taken, not
 * where it comes from: the frame path then reads the plain `state.scroll` field
 * instead of `window.scrollX`, which forces style+layout whenever a write has
 * dirtied the tree earlier in the frame. The returned function is the same
 * sampler, called explicitly at engage and at snap so every engagement re-syncs
 * authoritatively. Bubble phase on purpose: element-scroller events don't reach
 * window, which is exactly `window.scrollX` semantics. Listener lifecycle rides
 * the caller's AbortSignal.
 */
export function createScrollReader(state: IFrameState, signal: AbortSignal): () => void {
  const sync = () => {
    state.scroll.x = window.scrollX
    state.scroll.y = window.scrollY
  }
  sync()
  window.addEventListener('scroll', sync, { passive: true, signal })
  return sync
}
