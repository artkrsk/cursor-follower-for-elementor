import { MAGNETIC_ATTR } from '../constants'
import { createSession } from '../core/session'
import type {
  IEffectsSuite,
  IFrameState,
  IGeometryCache,
  IMagneticSessions,
  IMagnetizeOptions,
  IResolvedOptions
} from '../interfaces'
import { createMagnetic } from './magnetic'

/**
 * Magnetic engagement lifecycle: the trap controller plus the bookkeeping that
 * decides who owns it. Hover engagement streams live geometry for the anchor
 * (entrance animations keep the trap centred instead of freezing a stale
 * snapshot); a programmatic magnetize() session takes precedence and is ended
 * by its owner, never by hover or by distance.
 */

export function createMagneticSessions(args: {
  root: HTMLElement
  state: IFrameState
  geometry: IGeometryCache
  options: Pick<IResolvedOptions, 'magnetic' | 'animation'>
  suite: IEffectsSuite
  readScroll: () => void
  wake: () => void
}): IMagneticSessions {
  const { root, geometry, options, suite } = args

  /** The active magnetize() session's engine-side record. The field is
      required-but-possibly-undefined so the caller's optional `trailing` can be
      forwarded verbatim under exactOptionalPropertyTypes. */
  let live: { trailing: IMagnetizeOptions['trailing'] } | null = null
  /** Stops the geometry stream feeding a hover-engaged (element) anchor. */
  let stopStream: (() => void) | null = null

  const clearTrap = () => {
    root.removeAttribute(MAGNETIC_ATTR)
    stopStream?.()
    stopStream = null
  }

  const controller = createMagnetic({
    state: args.state,
    options,
    readScroll: args.readScroll,
    onRelease: clearTrap
  })

  return {
    controller,

    trailingOverride: () => live?.trailing?.() ?? null,

    engageHover(element, payload, trigger) {
      if (options.magnetic === false || live) {
        return
      }
      // Measured fresh, not served from cache: a fixed or stuck-sticky element
      // (sticky headers) keeps its client rect while the page scrolls, so its
      // cached page coordinates are stale by the whole scroll delta — the first
      // frames would render toward the old position and inflate the release
      // radius. The trigger's rect is the zone the trap holds inside; the
      // anchor entry doubles as the zone when the zone IS the effect element.
      // The zone is measured once at engage, not streamed — a rect that moves
      // during an entrance animation just falls back to the radius release.
      const entry = geometry.measure(element)
      const zone = trigger === element ? entry : geometry.measure(trigger)
      stopStream?.()
      stopStream = geometry.stream(element)
      const strength =
        typeof payload.magnetic === 'number' ? payload.magnetic : options.magnetic.strength
      // Normalized here rather than in the trap: 1 means "leave it alone", and
      // an inline `scale: 1` would override whatever the element's CSS sets.
      const elementScale =
        typeof payload.elementScale === 'number'
          ? payload.elementScale
          : options.magnetic.elementScale
      controller.engage(element, strength, entry, zone, elementScale === 1 ? null : elementScale)
      root.setAttribute(MAGNETIC_ATTR, '')
      args.wake()
    },

    releaseHover() {
      if (controller.engaged && !live) {
        controller.release()
        clearTrap()
        args.wake()
      }
    },

    magnetize(opts) {
      if (options.magnetic === false) {
        return createSession(() => {})
      }
      // A live trap supersedes any hover-driven one.
      if (controller.engaged) {
        controller.release()
      }
      live = { trailing: opts.trailing }
      const payloadRelease = opts.payload ? suite.addSession(opts.payload) : null
      // Strength may be a per-frame getter (dial 0 while dragging) or a fixed
      // number; either way a null/absent value falls back to the configured default.
      const strengthOpt = opts.strength
      const defaultStrength = options.magnetic.strength
      const getStrength =
        typeof strengthOpt === 'function'
          ? () => strengthOpt() ?? defaultStrength
          : () => strengthOpt ?? defaultStrength
      controller.engageLive(opts.getAnchor, getStrength)
      root.setAttribute(MAGNETIC_ATTR, '')
      args.wake()
      let released = false
      return createSession(() => {
        if (released) {
          return
        }
        released = true
        live = null
        controller.release()
        clearTrap()
        payloadRelease?.()
        args.wake()
      })
    },

    dispose() {
      live = null
      stopStream?.()
      stopStream = null
      controller.dispose()
    }
  }
}
