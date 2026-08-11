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
      const entry = geometry.resolve(element)
      // The trigger's rect is the zone the trap holds inside; the
      // anchor entry doubles as the zone when the zone IS the effect element.
      // Resolved once at engage, not streamed — a stale rect during an
      // entrance animation just falls back to the radius release and
      // self-heals on the next revalidation.
      const zone = trigger === element ? entry : geometry.resolve(trigger)
      stopStream?.()
      stopStream = geometry.stream(element)
      const strength =
        typeof payload.magnetic === 'number' ? payload.magnetic : options.magnetic.strength
      controller.engage(element, strength, entry, zone)
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
