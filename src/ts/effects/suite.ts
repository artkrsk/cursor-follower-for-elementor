import {
  ARROW_BREADTH_RATIO,
  ARROW_DEPTH_RATIO,
  ARROW_GAP_FALLBACK,
  ARROW_GAP_VAR,
  ARROW_RADIUS_VAR,
  ARROW_SIZE_FALLBACK,
  ARROW_SIZE_VAR,
  ARROWS_ATTR,
  ARROWS_POSITION_ATTR,
  BASE_SIZE_FALLBACK,
  BG_VAR,
  BORDER_COLOR_VAR,
  BORDER_WIDTH_VAR,
  CLEAR_DELAY_PAD_MS,
  COLLAPSED_ATTR,
  DISABLED_SELECTOR,
  DOT_ATTR,
  HIGHLIGHT_ATTR,
  HINT_ATTR,
  HINT_ICON_ATTR,
  HINT_OFFSET_X,
  HINT_OFFSET_X_VAR,
  HINT_OFFSET_Y,
  HINT_OFFSET_Y_VAR,
  HINT_PAD_X,
  HINT_PAD_X_VAR,
  HINT_PAD_Y,
  HINT_PAD_Y_VAR,
  HTML_NO_NATIVE,
  HTML_PROGRESS,
  ICON_KIND_ATTR,
  ICON_MASK_VAR,
  LOADING_ATTR,
  LOADING_OUT_ATTR,
  NO_HIGHLIGHT_SELECTOR,
  OFFSET_X_VAR,
  OFFSET_Y_VAR,
  PRESS_VAR,
  PRESSED_ATTR,
  SCALE_PRESSED_VAR,
  SCALE_VAR,
  SHAPE_ATTR,
  SHAPE_AXIS_ATTR,
  SHAPE_HEIGHT_VAR,
  SHAPE_WIDTH_VAR,
  SIZE_VAR,
  TEXT_COLOR_VAR
} from '../constants'
import type {
  IAppearance,
  ICursorPayload,
  ICursorRefs,
  IEffectsSuite,
  IGeometryCache,
  IResolvedOptions
} from '../interfaces'
import { hintFitScale, resolveScale, usesTargetRef } from '../utils'

/**
 * Effect state, computed from LAYERS: the transient hover payload at the
 * bottom, then programmatic sessions in creation order (last wins per key).
 * Any layer change triggers one recompute of the merged effective payload —
 * so independent consumers compose instead of fighting (two loaders, a drag
 * state over a transition, etc.), and releasing a session restores exactly
 * what remains. No sticky flags, no reset ambiguity.
 *
 * All animation lives in CSS: this module only flips data-cursor-* attributes,
 * two document-level classes, and custom properties; transitions do the rest.
 * Everything that decides *what* to write is a pure module-scope function
 * taking explicit arguments; recompute() is the applier, with its label
 * section split out as a module-scope sub-applier (applyHint) that takes its
 * state explicitly.
 *
 * Every element written to arrives through args — including `html`, so nothing
 * here resolves the document itself. That is not full independence from the
 * environment: hintPad reads getComputedStyle, clearAfterTransition
 * uses setTimeout, and the label-box memo clears on ownerDocument.fonts.ready — so
 * the module still needs a DOM.
 */

const isLeftUnmodified = (e: PointerEvent) =>
  e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey

/** Absent (null or undefined) removes the property — the deciders below return
    "nothing to say" that way, so no call site needs its own `?? null`. */
const setVar = (
  el: HTMLElement | null,
  name: string,
  value: string | number | null | undefined
) => {
  if (!el) {
    return
  }
  if (value == null) {
    el.style.removeProperty(name)
  } else {
    el.style.setProperty(name, String(value))
  }
}

/** Attribute mirror of setVar: an absent or false value removes. */
const setAttr = (el: HTMLElement, name: string, value: string | false | null | undefined) => {
  if (value) {
    el.setAttribute(name, value)
  } else {
    el.removeAttribute(name)
  }
}

/** One px var off a computed style; the constant fallback covers a DOM with no
    stylesheet (tests). */
const readPxVar = (cs: CSSStyleDeclaration | null, name: string, fallback: number) => {
  const v = cs ? Number.parseFloat(cs.getPropertyValue(name)) : Number.NaN
  return Number.isFinite(v) ? v : fallback
}

/** Copies one key only when the layer actually stated it — an explicit
    `undefined` means "not stated," never a clobber of a lower layer's value.
    Generic so the write typechecks: a plain `keyof` union's write position
    collapses to the intersection of all field types. */
const assignDefined = <T, K extends keyof T>(target: T, key: K, value: T[K] | undefined) => {
  if (value !== undefined) {
    target[key] = value
  }
}

/** Hover payload at the bottom, sessions stacked over it — last wins per
    STATED key. */
export const mergeLayers = (
  hover: ICursorPayload | undefined,
  sessions: ICursorPayload[]
): ICursorPayload => {
  const merged: ICursorPayload = { ...hover }
  for (const session of sessions) {
    for (const key of Object.keys(session) as (keyof ICursorPayload)[]) {
      assignDefined(merged, key, session[key])
    }
  }
  return merged
}

/** The hovered element's larger dimension — costs a layout read when cold. */
const targetSizeOf = (geometry: IGeometryCache, element: Element | null) => {
  if (!element) {
    return undefined
  }
  const entry = geometry.resolve(element)
  return Math.max(entry.w, entry.h)
}

/** Element/payload side of the highlight decision; the global toggle is the
    caller's check. */
export const highlightEligible = (merged: ICursorPayload, element: Element | null): boolean => {
  if (element && (element.closest(NO_HIGHLIGHT_SELECTOR) || element.matches(DISABLED_SELECTOR))) {
    return false
  }
  if (Object.keys(merged).length > 0) {
    // With a payload present, highlight is opt-in: an authored payload means
    // the author is in charge.
    return merged.highlight !== undefined && merged.highlight !== false
  }
  // Bare interactive (link/button/.has-cursor-highlight): auto-highlight.
  return element !== null
}

/**
 * Scale and the highlight decision for a merged payload. The hovered
 * element is measured only when the size grammar actually references it (a
 * clamp bound counts) — hovering a plain link must not force a layout read.
 * The highlight scale wins only if it resolves; otherwise the payload's own
 * scale stands.
 */
export const resolveAppearance = (
  merged: ICursorPayload,
  element: Element | null,
  geometry: IGeometryCache,
  baseSize: number,
  highlightOption: IResolvedOptions['highlight']
): IAppearance => {
  if (highlightOption === false || !highlightEligible(merged, element)) {
    const targetSize = usesTargetRef(merged.scale) ? targetSizeOf(geometry, element) : undefined
    return {
      scale: resolveScale(merged.scale ?? null, baseSize, targetSize),
      highlight: false
    }
  }
  const config = typeof merged.highlight === 'object' ? merged.highlight : {}
  const highlightScale = config.scale ?? highlightOption.scale
  const targetSize =
    usesTargetRef(merged.scale) || usesTargetRef(highlightScale)
      ? targetSizeOf(geometry, element)
      : undefined
  const payloadScale = resolveScale(merged.scale ?? null, baseSize, targetSize)
  return {
    scale: resolveScale(highlightScale, baseSize, targetSize) ?? payloadScale,
    highlight: true
  }
}

/** Explicit payload width, written inline so it beats kit CSS; null otherwise.
    Optical constancy under scaling lives in the stylesheet — box-shadow divides
    the width var by the scale var — so there is nothing to compensate here, and
    kit rules may re-declare the var per state. */
export const borderWidthCss = (width: number | string | undefined): string | null => {
  if (width !== undefined) {
    return typeof width === 'number' ? `${width}px` : width
  }
  return null
}

/** The ring's live radius in px (base size × the applied scale), written as a
    plain inheriting var so the arrow siblings seat against the current edge —
    no per-frame JS. */
export const arrowRadiusCss = (baseSize: number, scale: number | null): string =>
  `${(baseSize * (scale ?? 1)) / 2}px`

/** A shown label floors the ring: the circle has to contain its text box
    whatever the payload asked for. `labelFit` is 0 when no label is shown, and
    a payload with no scale of its own starts from 1 rather than from null. */
export const floorScale = (scale: number | null, labelFit: number): number | null =>
  labelFit > 0 ? Math.max(scale ?? 1, labelFit) : scale

/** The pill's box hugging a label: height = label box + vertical padding, width
    = label box + horizontal padding (floored to a circle so a 1-char label is
    still a disc). The follower morphs by animating its own box to this width and
    height; a width equal to the height IS the circle. Pure. */
export const pillGeometry = (
  labelW: number,
  labelH: number,
  padX: number,
  padY: number
): { width: number; height: number } => {
  const height = labelH + 2 * padY
  const width = Math.max(labelW + 2 * padX, height)
  return { width, height }
}

/** The room an active INSIDE arrow pair asks of the shape. `x`/`y` grow the
    half-dimension on the pointing axis by gap + glyph depth (size×⅓) — the CSS
    seat calc parks the tail at reach − gap − depth, so this lands it flush with
    the un-reserved content edge (the pill's own padding stays the only inner
    breathing room). `floorW`/`floorH` floor the PERPENDICULAR content axis to
    the glyph's breadth (size×⅔), so arrows alone can establish a box that
    wraps the chevron. All zeros when arrows are off or seated outside —
    nothing to reserve for there; `theme` is a thunk so the computed-style read
    behind it stays off payloads that reserve nothing. Pure. */
export const arrowReservation = (
  merged: ICursorPayload,
  theme: () => { gap: number; size: number }
): { x: number; y: number; floorW: number; floorH: number } => {
  if (!merged.arrows || merged.arrowsPosition === 'outside') {
    return { x: 0, y: 0, floorW: 0, floorH: 0 }
  }
  const { gap, size } = theme()
  const depth = gap + size * ARROW_DEPTH_RATIO
  const breadth = size * ARROW_BREADTH_RATIO
  const horizontal = merged.arrows === 'horizontal' || merged.arrows === 'all'
  const vertical = merged.arrows === 'vertical' || merged.arrows === 'all'
  return {
    x: horizontal ? depth : 0,
    y: vertical ? depth : 0,
    floorW: vertical ? breadth : 0,
    floorH: horizontal ? breadth : 0
  }
}

/** The pill box an active INSIDE pair establishes with no label content —
    glyph-breadth content wrapped in the same padding vars, grown by the
    reservation on the pointing axis. One pair commits the stadium to its own
    axis; 'all' would be a rounded square (neither pill nor circle) and falls
    through to the base circle — null, like every payload that reserves
    nothing. The vertical stadium is the transpose of the horizontal one — the
    long axis takes the wide padding + reservation, the cross axis the snug
    padding — so pillGeometry runs transposed and swaps back, keeping its
    "equal sides IS the circle" floor. Pure. */
export const arrowOnlyPill = (
  merged: ICursorPayload,
  hintPad: () => { x: number; y: number },
  arrowTheme: () => { gap: number; size: number }
): { width: number; height: number } | null => {
  if (merged.shape !== 'pill') {
    return null
  }
  const r = arrowReservation(merged, arrowTheme)
  if (r.x && !r.y) {
    const pad = hintPad()
    return pillGeometry(r.floorW, r.floorH, pad.x + r.x, pad.y + r.y)
  }
  if (r.y && !r.x) {
    const pad = hintPad()
    const t = pillGeometry(0, r.floorW, pad.x + r.y, pad.y)
    return { width: t.height, height: t.width }
  }
  return null
}

/** The auto nudge as CSS values rather than literals, so Site Settings can
    retune both distances through the kit vars while this module keeps deciding
    when a nudge applies at all. The constants stay the fallbacks. */
const HINT_OFFSET_X_CSS = `var(${HINT_OFFSET_X_VAR}, ${HINT_OFFSET_X}px)`
const HINT_OFFSET_Y_CSS = `var(${HINT_OFFSET_Y_VAR}, ${HINT_OFFSET_Y}px)`

/** The pair that shifts the whole cluster off the pointer, signed CSS
    convention (+x right, +y down): an explicit payload offset wins (in px),
    otherwise a label or icon auto-nudges so its content clears the OS cursor —
    the -28px Y fallback points up, a kit-var choice, not a mechanism. Skipped
    when the native cursor is hidden, since there's nothing to clear. Null when
    the cluster sits on the pointer. */
export const offsetCss = (merged: ICursorPayload): [string, string] | null => {
  if (merged.offset) {
    return [`${merged.offset[0]}px`, `${merged.offset[1]}px`]
  }
  const autoNudge = (merged.label || iconKind(merged)) && !merged.hideNativeCursor
  return autoNudge ? [HINT_OFFSET_X_CSS, HINT_OFFSET_Y_CSS] : null
}

/** Clear content after the hide transition so it doesn't vanish mid-fade. */
const clearAfterTransition = (el: HTMLElement, delayMs: number, clear: () => void) => {
  let done = false
  const finish = () => {
    if (!done) {
      done = true
      clear()
    }
  }
  el.addEventListener('transitionend', finish, { once: true })
  setTimeout(finish, delayMs)
}

/**
 * Retract a content part: lower its attribute, then clear it once the hide
 * transition ends. Shared by the label and the icon — they differ in what they
 * set, not in how they retract. A newer recompute may have re-shown the part by
 * the time the callback runs, which the second attribute check catches.
 */
const hideContent = (
  root: HTMLElement,
  el: HTMLElement,
  attr: string,
  delayMs: number,
  clear: () => void
) => {
  root.removeAttribute(attr)
  clearAfterTransition(el, delayMs, () => {
    if (!root.hasAttribute(attr)) {
      clear()
    }
  })
}

/** Which of the three icon forms a payload states, in precedence order — a
    masked URL wins because it is the only one that can be recoloured, then a
    glyph class, then raw markup. Null when the payload asks for no icon. Pure. */
export const iconKind = (merged: ICursorPayload): 'mask' | 'glyph' | 'markup' | null => {
  if (merged.iconUrl) {
    return 'mask'
  }
  if (merged.iconClass) {
    return 'glyph'
  }
  return merged.icon ? 'markup' : null
}

/** Fill the text and icon slots and raise the label attributes. Text and the
    optional icon go in their own slots (built markup); adopted markup without
    them falls back to text on the label itself, no icon. Markup is raw
    author-trusted HTML — set as innerHTML; a glyph becomes a real element so a
    class string never has to be escaped into markup. */
const fillHintSlots = (
  merged: ICursorPayload,
  refs: ICursorRefs,
  root: HTMLElement,
  hint: HTMLElement
) => {
  const textEl = refs.hintText ?? hint
  textEl.textContent = merged.label ?? ''
  const kind = iconKind(merged)
  const slot = refs.hintIcon
  if (slot) {
    if (kind === 'glyph' && merged.iconClass) {
      const glyph = slot.ownerDocument.createElement('i')
      glyph.className = merged.iconClass
      slot.textContent = ''
      slot.appendChild(glyph)
    } else {
      slot.innerHTML = kind === 'markup' ? (merged.icon ?? '') : ''
    }
    setVar(slot, ICON_MASK_VAR, kind === 'mask' ? `url("${merged.iconUrl}")` : null)
  }
  setAttr(root, HINT_ICON_ATTR, kind ? (merged.iconPosition ?? 'after') : false)
  setAttr(root, ICON_KIND_ATTR, kind)
  root.setAttribute(HINT_ATTR, '')
}

/** Empty the label and icon slots. Deferred behind a retract so the content
    fades with the hint, immediate when the cluster keeps rendering. */
const clearHintSlots = (refs: ICursorRefs, root: HTMLElement, hint: HTMLElement) => {
  const textEl = refs.hintText ?? hint
  textEl.textContent = ''
  if (refs.hintIcon) {
    refs.hintIcon.innerHTML = ''
    setVar(refs.hintIcon, ICON_MASK_VAR, null)
  }
  root.removeAttribute(HINT_ICON_ATTR)
  root.removeAttribute(ICON_KIND_ATTR)
}

/** Lower the label and clear its slots once the hide transition ends. */
const retractHint = (
  refs: ICursorRefs,
  root: HTMLElement,
  hint: HTMLElement,
  clearDelay: number
) => {
  hideContent(root, hint, HINT_ATTR, clearDelay, () => {
    clearHintSlots(refs, root, hint)
  })
}

/**
 * The label section of a recompute: fill the slots and measure (memoized) when
 * a label is shown, retract when one was up. Returns what the rest of the
 * recompute needs from the label — the circle-floor scale and the pill box.
 * Active inside arrows reserve their room in whichever box wins (the pill
 * grows, the circle floor inflates), and on a pill they can establish the box
 * with no label at all — so `pill` can be non-null when nothing shows.
 * The pill DEMOTES to the circle whenever an inside pair grows its vertical
 * axis against competing horizontal content — a labeled pill with any vertical
 * reservation, or an 'all' pair with or without one — because the near-square
 * result reads as neither pill nor circle. The exception is
 * a label-less vertical pair: with nothing competing for width, the shape
 * commits to the vertical axis as a true vertical stadium.
 */
export const applyHint = (
  merged: ICursorPayload,
  refs: ICursorRefs,
  root: HTMLElement,
  labelBoxes: Map<string, { w: number; h: number }>,
  hintPad: () => { x: number; y: number },
  arrowTheme: () => { gap: number; size: number },
  baseSize: number,
  clearDelay: number
): { labelFit: number; pill: { width: number; height: number } | null } => {
  // An icon with no wording is content in its own right, so the pill has to
  // render for it — gating on the label alone left an icon-only payload invisible.
  if ((merged.label || iconKind(merged)) && refs.hint) {
    fillHintSlots(merged, refs, root, refs.hint)
    // NUL join so "a b" + "" can't collide with "a" + "b".
    const key = [merged.label, merged.icon, merged.iconClass, merged.iconUrl].join('\u0000')
    let box = labelBoxes.get(key)
    if (!box) {
      // offsetWidth/Height are transform-independent (the reveal scale and the
      // root's elastic matrix don't distort them), so they read the intrinsic
      // label box — icon included, so the pill/circle sizes to fit both. One
      // layout flush, on a cache miss only — off the frame path.
      box = { w: refs.hint.offsetWidth, h: refs.hint.offsetHeight }
      labelBoxes.set(key, box)
    }
    const r = arrowReservation(merged, arrowTheme)
    const w = Math.max(box.w, r.floorW)
    const h = Math.max(box.h, r.floorH)
    const pad = hintPad()
    // Any vertical reservation on a LABELED pill is the demotion case: width
    // stays text-driven while height grows arrow-driven, and the near-square
    // (or rounded-square, for 'all') result reads as neither pill nor circle —
    // the circle floor below sizes the ring to contain label + arrows instead.
    if (merged.shape === 'pill' && r.y === 0) {
      // Pill hugs the label instead of growing the circle, so labelFit stays 0.
      return { labelFit: 0, pill: pillGeometry(w, h, pad.x + r.x, pad.y + r.y) }
    }
    // The circle fits the PADDED box, not the bare one — the same two knobs the
    // pill pads its stadium with. Padding the box rather than the radius is what
    // makes it read as padding on a wide label: the ring has to contain the
    // box's diagonal, and for a wide short label that diagonal is essentially
    // its width, so a radial margin would land almost entirely on the axis that
    // already had room to spare and none on the one that looked cramped.
    return {
      labelFit: hintFitScale(w + 2 * pad.x, h + 2 * pad.y, baseSize, Math.max(r.x, r.y)),
      pill: null
    }
  }
  if (root.hasAttribute(HINT_ATTR) && refs.hint) {
    retractHint(refs, root, refs.hint, clearDelay)
  }
  // HINT_ATTR stays down for an arrow-only pill: its styling keys on the
  // shape attr.
  const pill = arrowOnlyPill(merged, hintPad, arrowTheme)
  // That pill keeps the cluster on screen, so the retract above has no end
  // for its deferred clear to arrive at — the previous payload's label or
  // icon would sit inside the arrows. Empty the slots now instead.
  if (pill && refs.hint) {
    clearHintSlots(refs, root, refs.hint)
  }
  return { labelFit: 0, pill }
}

export function createEffectsSuite(args: {
  refs: ICursorRefs
  options: IResolvedOptions
  geometry: IGeometryCache
  /** Target for the two document-level flags — documentElement in the engine. */
  html: HTMLElement
}): IEffectsSuite {
  const { refs, options, geometry, html } = args
  const root = refs.root
  const follower = refs.follower

  // Base cursor size for scale resolution — one layout read at creation time,
  // re-sampled only through remeasure().
  let baseSize = follower
    ? Math.max(follower.offsetWidth, follower.offsetHeight) || BASE_SIZE_FALLBACK
    : BASE_SIZE_FALLBACK
  // Read at retract time, not captured: the composition root re-derives
  // options.animation from computed CSS (the kit Duration control is live in
  // the editor), and a clear scheduled against a stale duration would cut the
  // content off mid-transition.
  const clearDelay = () => options.animation.duration * 1000 + CLEAR_DELAY_PAD_MS

  // Loading exit choreography: hideContent's deferred-clear idiom, generalized
  // to two attributes — CSS sequences "become visible" for free
  // (transition-delay) but can't remove its own transient state. The settle
  // gate marks the moment the circle's collapse leg has run its course, i.e.
  // the earliest the spinner could be visible: an exit before that skips the
  // transient entirely, or the delayed restore would hold a half-collapsed
  // circle waiting on a spinner that never appeared.
  let loadingSettleTimer: ReturnType<typeof setTimeout> | null = null
  let loadingOutTimer: ReturnType<typeof setTimeout> | null = null
  let loadingSettled = false

  const clearLoadingTimers = () => {
    if (loadingSettleTimer !== null) {
      clearTimeout(loadingSettleTimer)
      loadingSettleTimer = null
    }
    if (loadingOutTimer !== null) {
      clearTimeout(loadingOutTimer)
      loadingOutTimer = null
    }
  }

  const applyLoading = (showLoading: boolean) => {
    const wasLoading = root.hasAttribute(LOADING_ATTR)
    if (showLoading === wasLoading) {
      return
    }
    if (showLoading) {
      // Re-entering mid-exit: drop the transient and reverse from wherever
      // the circle/spinner currently sit.
      if (loadingOutTimer !== null) {
        clearTimeout(loadingOutTimer)
        loadingOutTimer = null
      }
      root.removeAttribute(LOADING_OUT_ATTR)
      root.setAttribute(LOADING_ATTR, '')
      loadingSettled = false
      if (loadingSettleTimer !== null) {
        clearTimeout(loadingSettleTimer)
      }
      loadingSettleTimer = setTimeout(() => {
        loadingSettled = true
        loadingSettleTimer = null
      }, options.animation.duration * 1000)
      return
    }
    if (loadingSettleTimer !== null) {
      clearTimeout(loadingSettleTimer)
      loadingSettleTimer = null
    }
    root.removeAttribute(LOADING_ATTR)
    if (!loadingSettled) {
      return
    }
    root.setAttribute(LOADING_OUT_ATTR, '')
    loadingOutTimer = setTimeout(
      () => {
        root.removeAttribute(LOADING_OUT_ATTR)
        loadingOutTimer = null
      },
      2 * options.animation.duration * 1000 + CLEAR_DELAY_PAD_MS
    )
  }

  let hover: { payload: ICursorPayload; element: Element | null } | null = null
  const sessions: ICursorPayload[] = []

  // Hint padding: the tunable CSS vars, read once (same lazy pattern) so both
  // shapes can be sized in JS — the pill pads its stadium with them, the circle
  // grows until the padded box fits. Falls back to constants when there's no
  // stylesheet.
  let cachedPad: { x: number; y: number } | null = null
  const hintPad = () => {
    if (cachedPad === null) {
      const cs = follower ? getComputedStyle(follower) : null
      cachedPad = {
        x: readPxVar(cs, HINT_PAD_X_VAR, HINT_PAD_X),
        y: readPxVar(cs, HINT_PAD_Y_VAR, HINT_PAD_Y)
      }
    }
    return cachedPad
  }

  // Same read-once pattern for the theme's arrow box size + gap — one computed
  // style, sampled only when a payload actually reserves arrow room
  // (arrowReservation calls the thunk after its own guard).
  let cachedArrowTheme: { gap: number; size: number } | null = null
  const arrowTheme = () => {
    if (cachedArrowTheme === null) {
      const cs = follower ? getComputedStyle(follower) : null
      cachedArrowTheme = {
        gap: readPxVar(cs, ARROW_GAP_VAR, ARROW_GAP_FALLBACK),
        size: readPxVar(cs, ARROW_SIZE_VAR, ARROW_SIZE_FALLBACK)
      }
    }
    return cachedArrowTheme
  }

  // Last-written value per custom property, so a recompute that changes one
  // layer does not rewrite the rest — an identical setProperty still dirties
  // style. Var names are unique across root/follower, so the name is the key.
  const written = new Map<string, string | null>()
  const writeVar = (
    el: HTMLElement | null,
    name: string,
    value: string | number | null | undefined
  ) => {
    if (!el) {
      return
    }
    const next = value == null ? null : String(value)
    if (written.get(name) === next) {
      return
    }
    written.set(name, next)
    setVar(el, name, next)
  }

  // Label box memo: refs.hint.offsetWidth/Height is a forced synchronous layout,
  // and the same label recurs across a page's links. Cache the measured box keyed
  // by what changes it — the text and the icon markup; the icon side is `order`
  // only, so it reorders the flex row without changing the box. The pill/floor
  // maths recompute from the cached box each hover (both pure), so shape switching
  // costs no layout. Font-dependent — cleared once the initial webfont load
  // settles (a held fonts.ready promise is one-shot, so later font loads never
  // re-clear; read off ownerDocument, not the global — the module resolves no
  // document of its own).
  const labelBoxes = new Map<string, { w: number; h: number }>()
  root.ownerDocument.fonts?.ready.then(() => labelBoxes.clear())

  const recompute = () => {
    const merged = mergeLayers(hover?.payload, sessions)
    const element = hover?.element ?? null

    // -- label (applied FIRST so its measured box sizes the pill / floors the
    //    circle scale below) --
    const { labelFit, pill } = applyHint(
      merged,
      refs,
      root,
      labelBoxes,
      hintPad,
      arrowTheme,
      baseSize,
      clearDelay()
    )

    // -- scale (highlight config wins; a label floors the size) --
    const appearance = resolveAppearance(merged, element, geometry, baseSize, options.highlight)
    const scale = floorScale(appearance.scale, labelFit)
    root.toggleAttribute(HIGHLIGHT_ATTR, appearance.highlight)
    // Exactly 0, not <= 0: the scale grammar never produces a negative, and a
    // label floors its own payload above zero, so a labeled pill — which never
    // collapses to a point anyway — correctly never trips this.
    root.toggleAttribute(COLLAPSED_ATTR, scale === 0)
    writeVar(follower, SCALE_VAR, scale)
    // Live ring radius the arrows seat against (plain, inheriting — see _parts).
    // Written every pass, pill included: under a pill it is inert purely because
    // the CSS reach calc prefers the shape vars over it — that fallback order is
    // the whole contract between this write and the shape write below.
    writeVar(root, ARROW_RADIUS_VAR, arrowRadiusCss(baseSize, scale))

    // -- colors / border --
    writeVar(root, TEXT_COLOR_VAR, merged.textColor)
    writeVar(root, BG_VAR, merged.backgroundColor)
    writeVar(root, BORDER_COLOR_VAR, merged.borderColor)
    writeVar(root, BORDER_WIDTH_VAR, borderWidthCss(merged.borderWidth))

    // -- shape: the follower morphs to the pill's box (absent → circle). The
    //    axis mark is derived from the box itself (a labeled pill can never be
    //    taller than wide, so height > width IS the vertical stadium) and
    //    steers which side the pressed clamp squeezes. --
    setAttr(root, SHAPE_ATTR, pill ? 'pill' : false)
    setAttr(root, SHAPE_AXIS_ATTR, pill ? (pill.height > pill.width ? 'y' : 'x') : false)
    writeVar(root, SHAPE_WIDTH_VAR, pill ? `${pill.width}px` : null)
    writeVar(root, SHAPE_HEIGHT_VAR, pill ? `${pill.height}px` : null)

    // -- offset: shift the cluster off the pointer --
    const [offsetX, offsetY] = offsetCss(merged) ?? [null, null]
    writeVar(root, OFFSET_X_VAR, offsetX)
    writeVar(root, OFFSET_Y_VAR, offsetY)

    // -- icon --

    // -- arrows --
    setAttr(root, ARROWS_ATTR, merged.arrows)
    setAttr(root, ARROWS_POSITION_ATTR, merged.arrowsPosition)

    // -- press dot (eligibility only; the stylesheet keys the scale-up on this
    //    plus data-cursor-pressed) --
    root.toggleAttribute(DOT_ATTR, merged.dot === true)

    // -- document-level states (the merged view IS the refcount) --
    html.classList.toggle(HTML_NO_NATIVE, merged.hideNativeCursor === true)
    html.classList.toggle(HTML_PROGRESS, merged.showProgressCursor === true)
    applyLoading(merged.showLoadingAnimation === true)
  }

  return {
    setHover(payload, element) {
      hover = { payload, element }
      recompute()
    },
    clearHover() {
      if (hover) {
        hover = null
        recompute()
      }
    },
    addSession(payload) {
      sessions.push(payload)
      recompute()
      let released = false
      return () => {
        if (released) {
          return
        }
        released = true
        const index = sessions.indexOf(payload)
        if (index !== -1) {
          sessions.splice(index, 1)
        }
        recompute()
      }
    },
    handlePress(e) {
      if (options.pressScale === false || !isLeftUnmodified(e)) {
        return null
      }
      const scale = resolveScale(options.pressScale.scale, baseSize) ?? 1
      root.setAttribute(PRESSED_ATTR, '')
      setVar(follower, SCALE_PRESSED_VAR, scale)
      // Mirror onto the root (inheriting) so the arrows re-seat on the pressed
      // ring; the follower's registered var can't reach them.
      setVar(root, PRESS_VAR, scale)
      return scale
    },
    handleRelease(e) {
      if (e.button !== 0) {
        return false
      }
      root.removeAttribute(PRESSED_ATTR)
      setVar(follower, SCALE_PRESSED_VAR, null)
      setVar(root, PRESS_VAR, null)
      return true
    },
    remeasure() {
      // The winning cascade value, whoever set it. Only a px value is adoptable;
      // anything else (a theme var in rem, a calc()) is unparseable without a
      // layout read, and a layout read here would catch the width mid-transition
      // or under a pill's shape override — keep the current base instead.
      const raw = follower ? getComputedStyle(follower).getPropertyValue(SIZE_VAR).trim() : ''
      if (raw.endsWith('px')) {
        const parsed = Number.parseFloat(raw)
        if (Number.isFinite(parsed) && parsed > 0) {
          baseSize = parsed
        }
      }
      cachedPad = null
      cachedArrowTheme = null
      labelBoxes.clear()
      recompute()
    },
    dispose() {
      hover = null
      sessions.length = 0
      // Ahead of the recompute so its applyLoading(false) is a no-op: no
      // zombie timer may mutate a torn-down root later.
      clearLoadingTimers()
      root.removeAttribute(LOADING_ATTR)
      root.removeAttribute(LOADING_OUT_ATTR)
      recompute()
      html.classList.remove(HTML_NO_NATIVE, HTML_PROGRESS)
    }
  }
}
