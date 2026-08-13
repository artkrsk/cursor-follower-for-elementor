import {
  DEFAULT_EASING,
  ELEMENT_EASE,
  ELEMENT_RETURN_EPS,
  MS_PER_SECOND,
  PULL_FACTOR,
  RELEASE_RADIUS_PAD,
  RELEASE_RADIUS_SLACK
} from '../constants'
import type {
  IFrameState,
  IGeometryEntry,
  IMagneticController,
  IPullRecord,
  IResolvedOptions,
  IVec2
} from '../interfaces'
import type { TStyledElement } from '../types'
import { lerpFactor, round1 } from '../utils'

/**
 * Magnetic trap, composed in PAGE space:
 * - the anchor is read once per frame from the mode set at engage time:
 *   element mode follows the live geometry entry (kept fresh by the caller's
 *   geometry stream) corrected by the trap's own pull so the pull displacement
 *   can't feed back; live mode reads the caller's callback
 * - page space is scroll-invariant, so scrolling moves the *pointer* through
 *   the trap — strain grows naturally and element-mode traps release by
 *   distance; the engine renders `follower − scroll` (scroll applied outside
 *   the lerp — the glue)
 * - the release threshold adapts per engagement: at least the configured
 *   radius, but never smaller than the pointer's distance at engage time
 *   (hover zones larger than the radius would insta-release otherwise);
 *   live sessions never distance-release — their owner ends them
 * - element mode also pulls the target element toward the pointer via a
 *   per-frame eased translate write, returned to rest on release; a new
 *   engagement taking the slot hands the previous element to a returning
 *   queue that keeps easing it home instead of snapping it (slider dots sit
 *   next to each other), and re-engaging a queued element adopts its pull
 *
 * The mode is held in fields rather than per-engagement closures: the frame
 * path then calls one stable function instead of a callback whose identity
 * changes with every hover.
 */

/**
 * Last-wins override appended to an element's computed transition, so the
 * trap-owned properties (the per-frame `translate` pull, the eased pressed
 * `scale`) aren't re-animated by a theme's `transition: all` while the
 * element's own transitions (hover color, etc.) keep easing. A base with
 * nothing to preserve is replaced outright instead of appended to, which would
 * build an invalid declaration — `none` in a browser, and the empty string a
 * non-browser DOM returns, which is the only value a test outside a browser can
 * observe.
 */
export const composeTransition = (base: string, override: string): string =>
  !base || base.startsWith('none') ? override : `${base}, ${override}`

/** One ease step of a record's pull toward the target — the queue's return
    home is the same step with a (0, 0) target. */
export const easePull = (record: IPullRecord, tx: number, ty: number, k: number): void => {
  record.pull.x += (tx - record.pull.x) * k
  record.pull.y += (ty - record.pull.y) * k
}

/** Settled at the ORIGIN: both axes within the return epsilon of zero. That is
    the only settle the trap ever tests — a queue entry always eases home, and
    the active record is checked only after release zeroes its target. Not a
    generic at-target test. */
export const atRest = (record: IPullRecord): boolean =>
  Math.abs(record.pull.x) < ELEMENT_RETURN_EPS && Math.abs(record.pull.y) < ELEMENT_RETURN_EPS

/**
 * The engaged element's inline `scale`. One property, two writers: the resting
 * shrink an engagement applies, and the press ratio mirrored from the ring. The
 * press REPLACES rather than compounds, so a press reads as one depth whatever
 * the resting shrink is — which does mean a resting scale below the press ratio
 * inverts the press into a grow. Deliberate, not an oversight.
 *
 * `''` when neither applies, so the property falls back to the element's own
 * CSS — which is also why a resting value of exactly 1 has to arrive here as
 * null rather than as a number.
 */
export const composeElementScale = (resting: number | null, pressed: number | null): string => {
  const value = pressed ?? resting
  return value === null ? '' : String(value)
}

/** Quantize, dedupe against the record's last written pair, write the inline
    translate. The template string only allocates when a write happens. */
export const writePull = (el: TStyledElement, record: IPullRecord): void => {
  const x = round1(record.pull.x)
  const y = round1(record.pull.y)
  if (x !== record.lastX || y !== record.lastY) {
    record.lastX = x
    record.lastY = y
    el.style.translate = `${x}px ${y}px`
  }
}

export function createMagnetic(args: {
  state: IFrameState
  options: Pick<IResolvedOptions, 'magnetic' | 'animation'>
  /** Authoritative scroll re-sync, called at engage time only — the frame path
      reads the passively-maintained state.scroll instead. */
  readScroll: () => void
  /** Engine hook: bookkeeping when the trap releases itself by distance. */
  onRelease: () => void
}): IMagneticController {
  const { state, options } = args
  const anchor = { x: 0, y: 0 }
  /** The active element's pull state — preallocated once, reused across
      engagements. */
  const active: IPullRecord = { pull: { x: 0, y: 0 }, lastX: Number.NaN, lastY: Number.NaN }
  const pullTarget = { x: 0, y: 0 }
  let element: TStyledElement | null = null
  /** Element mode: the live geometry entry behind the anchor. */
  let anchorEntry: IGeometryEntry | null = null
  /** Element mode: the hover zone's rect — the trap holds anywhere inside it
      (the hover boundary owns release there), so distance release only fires
      once the page-space pointer is outside, which is what scroll does. */
  let zoneEntry: IGeometryEntry | null = null
  /** Live mode: the caller's page-space anchor callback. */
  let liveAnchor: (() => IVec2) | null = null
  /** Element mode: strength fixed at engage time. */
  let strength = 0
  /** Live mode: strength read once per frame (0 glues the ring rigidly to the
      anchor). */
  let liveStrength: (() => number) | null = null
  let engaged = false
  let releaseRadius = 0
  /** Click-scale ratio while the primary button is down — mirrored onto the
      engaged element as an inline `scale` so it shrinks with the cursor. */
  let pressedScale: number | null = null
  /** The current engagement's resting element scale, already normalized (null
      writes nothing). */
  let restingScale: number | null = null
  /** Whether this engagement ever wrote an inline `scale` — decides whether the
      return home has to outlast the scale transition (see `hold`). */
  let scaleWritten = false
  /** Milliseconds the element stays owned after release, ON TOP of the pull
      settling. The pull can rest within a frame or two — a fast flick across
      the element never builds one — while the scale is still easing back, and
      restore() strips the transition, which cancels it mid-flight and snaps the
      element. Zero unless a scale was actually written, so the default (no
      resting shrink, no press) keeps today's timing exactly. */
  let hold = 0

  /** Elements easing home after their engagement was taken over by another —
      each keeps its transition/will-change overrides until it arrives, then
      hands its inline styles back. Slider dots sit next to each other, so a
      neighbouring engagement must not cut the release bounce short. Each entry
      carries its own `hold` for the same reason the active element does. */
  const returning: ({ el: TStyledElement; hold: number } & IPullRecord)[] = []

  /** How long the element must outlive its pull, so a still-running scale
      transition isn't stripped mid-flight. */
  const holdMs = () => (scaleWritten ? options.animation.duration * MS_PER_SECOND : 0)

  /** Explicit args rather than reading the fields: engage() writes before
      enterPageSpace() flips `engaged`. */
  const writeScale = (resting: number | null, pressed: number | null) => {
    if (!element) {
      return
    }
    const value = composeElementScale(resting, pressed)
    if (value !== '') {
      scaleWritten = true
    }
    element.style.scale = value
  }

  const restore = (el: TStyledElement) => {
    el.style.translate = ''
    el.style.scale = ''
    el.style.removeProperty('transition')
    el.style.removeProperty('will-change')
  }

  const resetPull = () => {
    active.pull.x = 0
    active.pull.y = 0
    active.lastX = Number.NaN
    active.lastY = Number.NaN
    pullTarget.x = 0
    pullTarget.y = 0
  }

  const clearElement = () => {
    if (element) {
      restore(element)
      element = null
    }
    restingScale = null
    scaleWritten = false
    hold = 0
    resetPull()
  }

  /** Move the active element into the returning queue instead of snapping it;
      a pull already at rest is restored on the spot. The entry allocation is
      per hand-off (interaction path), not per frame. */
  const handOff = () => {
    if (element) {
      // Both shrinks ride the engagement — ease back while returning.
      writeScale(null, null)
      const wait = holdMs()
      if (atRest(active) && wait <= 0) {
        restore(element)
      } else {
        returning.push({
          el: element,
          hold: wait,
          pull: { x: active.pull.x, y: active.pull.y },
          lastX: active.lastX,
          lastY: active.lastY
        })
      }
      element = null
    }
    restingScale = null
    scaleWritten = false
    hold = 0
    resetPull()
  }

  /** Re-engaging an element still easing home takes its pull back over, so the
      write stream continues where it stands and the queue's settle can never
      strip the overrides off a live engagement. */
  const adoptReturning = (el: TStyledElement) => {
    for (let i = 0; i < returning.length; i++) {
      const r = returning[i]
      if (r && r.el === el) {
        active.pull.x = r.pull.x
        active.pull.y = r.pull.y
        active.lastX = r.lastX
        active.lastY = r.lastY
        returning.splice(i, 1)
        return
      }
    }
  }

  /** Writes `anchor` from whichever mode is engaged. */
  const readAnchor = () => {
    if (anchorEntry) {
      anchor.x = anchorEntry.pageX + anchorEntry.w / 2 - active.pull.x
      anchor.y = anchorEntry.pageY + anchorEntry.h / 2 - active.pull.y
    } else if (liveAnchor) {
      const live = liveAnchor()
      anchor.x = live.x
      anchor.y = live.y
    }
  }

  const enterPageSpace = () => {
    engaged = true
    args.readScroll()
    state.follower.x += state.scroll.x
    state.follower.y += state.scroll.y
  }

  return {
    get engaged() {
      return engaged
    },
    get busy() {
      return engaged || element !== null || returning.length > 0
    },

    engage(el, pullStrength, entry, zone, elementScale) {
      // A previous element keeps easing home in the returning queue; the new
      // one is taken back out of it if it was still on its way.
      if (element && element !== el) {
        handOff()
      }
      adoptReturning(el)
      element = el
      // Remove any prior inline value first so re-engagement reads the clean
      // base instead of stacking overrides. Restored in clearElement on return
      // to rest.
      el.style.removeProperty('transition')
      el.style.transition = composeTransition(
        getComputedStyle(el).transition,
        // The scale entry rides the cursor's animation tokens, so a pressed
        // shrink eases in sync with the ring's own pressed transition.
        `translate 0s, scale ${options.animation.duration}s ${options.animation.easing ?? DEFAULT_EASING}`
      )
      // Own compositor layer for the per-frame pull writes below — without it
      // every write re-rasters the element's area in its containing layer. No
      // new containing block: the inline `translate` the pull writes creates
      // the same one from the first tick anyway.
      el.style.willChange = 'translate'
      restingScale = elementScale ?? null
      writeScale(restingScale, pressedScale)
      strength = pullStrength
      liveStrength = null
      anchorEntry = entry
      zoneEntry = zone ?? null
      liveAnchor = null
      readAnchor()
      enterPageSpace()
      const entryDx = state.mouseClient.x + state.scroll.x - anchor.x
      const entryDy = state.mouseClient.y + state.scroll.y - anchor.y
      releaseRadius = Math.max(
        options.magnetic === false ? 0 : options.magnetic.releaseRadius,
        Math.sqrt(entryDx * entryDx + entryDy * entryDy) * RELEASE_RADIUS_SLACK + RELEASE_RADIUS_PAD
      )
    },

    engageLive(getAnchor, readStrength) {
      if (engaged) {
        this.release()
      }
      handOff()
      liveStrength = readStrength
      anchorEntry = null
      zoneEntry = null
      liveAnchor = getAnchor
      readAnchor()
      releaseRadius = Number.POSITIVE_INFINITY
      enterPageSpace()
    },

    release() {
      if (!engaged) {
        return
      }
      engaged = false
      anchorEntry = null
      zoneEntry = null
      liveAnchor = null
      // Both shrinks ride the engagement, not the press — hand them back now
      // (eased by the transition, which stays until the element rests).
      writeScale(null, null)
      restingScale = null
      hold = holdMs()
      // Back to viewport space; the element keeps easing to rest in tick().
      state.follower.x -= state.scroll.x
      state.follower.y -= state.scroll.y
    },

    setPressedScale(ratio) {
      pressedScale = ratio
      if (element && engaged) {
        // Lifting the press falls back to the resting shrink, not to nothing.
        writeScale(restingScale, ratio)
      }
    },

    tick(dt) {
      if (!element && returning.length === 0) {
        return
      }
      const k = lerpFactor(ELEMENT_EASE, dt)
      // Backwards so a settled entry can splice itself out mid-iteration.
      for (let i = returning.length - 1; i >= 0; i--) {
        const r = returning[i]
        if (!r) {
          continue
        }
        easePull(r, 0, 0, k)
        r.hold -= dt
        if (atRest(r) && r.hold <= 0) {
          restore(r.el)
          returning.splice(i, 1)
        } else {
          writePull(r.el, r)
        }
      }
      if (!element) {
        return
      }
      if (!engaged) {
        pullTarget.x = 0
        pullTarget.y = 0
        hold -= dt
      }
      easePull(active, pullTarget.x, pullTarget.y, k)
      if (!engaged && atRest(active) && hold <= 0) {
        clearElement()
        return
      }
      writePull(element, active)
    },

    composeTarget() {
      if (!engaged) {
        return false
      }
      // No scroll read here: state.scroll is kept current by the passive listener
      // in createScrollReader, so the frame path forces no layout. engage()'s
      // enterPageSpace() is the authoritative re-sync at every engagement.
      readAnchor()
      const px = state.mouseClient.x + state.scroll.x
      const py = state.mouseClient.y + state.scroll.y
      const dx = px - anchor.x
      const dy = py - anchor.y

      // Inside the zone the hover boundary owns release — an identical
      // engagement would re-form on any clean re-hover, so a distance release
      // there is pointless. Outside it (scroll carried the zone
      // away under a static pointer), the radius releases as before.
      const insideZone =
        zoneEntry !== null &&
        px >= zoneEntry.pageX &&
        px <= zoneEntry.pageX + zoneEntry.w &&
        py >= zoneEntry.pageY &&
        py <= zoneEntry.pageY + zoneEntry.h
      if (!insideZone && Math.sqrt(dx * dx + dy * dy) > releaseRadius) {
        this.release()
        args.onRelease()
        return false
      }

      const pullStrength = liveStrength ? liveStrength() : strength
      pullTarget.x = dx * PULL_FACTOR * pullStrength
      pullTarget.y = dy * PULL_FACTOR * pullStrength
      state.target.x = anchor.x + pullTarget.x
      state.target.y = anchor.y + pullTarget.y
      return true
    },

    dispose() {
      engaged = false
      anchorEntry = null
      zoneEntry = null
      liveAnchor = null
      strength = 0
      liveStrength = null
      pressedScale = null
      for (const r of returning) {
        restore(r.el)
      }
      returning.length = 0
      clearElement()
    }
  }
}
