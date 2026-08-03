import { HINT_CURSOR_SIZE_VAR, INTERACTIVE_SELECTOR, NO_TARGET_SELECTOR } from '../constants'
import { createEmitter } from '../core/emitter'
import { accepts } from '../core/input'
import type {
  ICompiledRule,
  ICursorPayload,
  ITargetContext,
  ITargetEvents,
  ITargetRule,
  ITargetScope,
  ITargets
} from '../interfaces'
import type { TStateVarKey } from '../types'
import { usesTargetRef } from '../utils'

/**
 * Interactive-target tracking: delegated pointerover/pointerout on the document
 * (they bubble — no capture trick). Rules are grouped by scope selector; each
 * rule's trigger is flattened against its scope once at construction, while its
 * anchor is resolved against the hovered scope INSTANCE at match time (so
 * `:scope .icon` targets the specific widget under the pointer, not the first on
 * the page). A single resolveTarget() pass — shared by both handlers — decides
 * the effect element and payload, so enter and leave compare the same element.
 */

/** Expand `:scope` in a trigger to the group scope; a bare selector is treated
    as a scope descendant. */
export const expandTrigger = (scope: string, selector: string): string =>
  selector.includes(':scope') ? selector.replaceAll(':scope', scope) : `${scope} ${selector}`

/** The trigger selector a rule matches on, flattened against its scope — an
    omitted selector means the scope root itself. */
export const ruleTrigger = (scope: string, rule: ITargetRule): string =>
  expandTrigger(scope, rule.selector ?? ':scope')

/** Does this rule's effect measure the hovered element? Magnetic pull reads its
    rect, and so does a size that references the target ('target' ref, directly or
    as a clamp bound). Arrows/label/colour-only rules measure nothing. */
export const needsGeometry = (p: ICursorPayload): boolean =>
  p.magnetic != null ||
  usesTargetRef(p.scale) ||
  (typeof p.highlight === 'object' && usesTargetRef(p.highlight.scale))

/** The selectors one rule needs page-space geometry for. An anchor BECOMES the
    effect element, so that is what gets warmed; a magnetic rule also needs its
    trigger, which is the release zone whose rect is read at engage time — hence
    the pair only when both are set, since with no anchor they are the same
    selector. */
export const ruleGeometry = (scope: string, rule: ITargetRule): string[] => {
  const p = rule.payload
  if (!needsGeometry(p)) {
    return []
  }
  if (!p.anchor) {
    return [ruleTrigger(scope, rule)]
  }
  return p.magnetic != null
    ? [expandTrigger(scope, p.anchor), ruleTrigger(scope, rule)]
    : [expandTrigger(scope, p.anchor)]
}

/**
 * The elements a rule set will need page-space geometry for, as one selector, so
 * the engine can warm them off the interaction path — a cold `geometry.resolve()`
 * on first hover forces a synchronous layout. Empty string when nothing needs it.
 */
export const geometrySelector = (scopes: ITargetScope[]): string => {
  const parts: string[] = []
  for (const group of scopes) {
    for (const rule of group.rules) {
      parts.push(...ruleGeometry(group.scope, rule))
    }
  }
  return parts.join(', ')
}

/** Resolve an anchor within a scope instance. `:scope` is the instance itself;
    otherwise a descendant query (native `:scope`-aware). */
export const resolveAnchor = (scopeEl: Element, anchor: string): Element | null =>
  anchor === ':scope' ? scopeEl : scopeEl.querySelector(anchor)

/** Per-element JSON payload, parsed once and memoized (misses cached as null). */
export const parsePayload = (
  payloads: WeakMap<Element, ICursorPayload | null>,
  attribute: string,
  el: Element
): ICursorPayload | null => {
  if (payloads.has(el)) {
    return payloads.get(el) ?? null
  }
  const raw = el.getAttribute(attribute)
  let parsed: ICursorPayload | null = null
  if (raw) {
    try {
      parsed = JSON.parse(raw) as ICursorPayload
    } catch {
      parsed = null
    }
    if (import.meta.env?.DEV) {
      console.debug('[cursor] payload parsed', el, parsed)
    }
  }
  payloads.set(el, parsed)
  return parsed
}

/**
 * The authored-attribute branch: the element itself is the scope, and an
 * explicit opt-in always applies — falling back to the element when the anchor
 * names nothing.
 */
export const authoredTarget = (
  payloads: WeakMap<Element, ICursorPayload | null>,
  attribute: string,
  target: Element
): ITargetContext => {
  const payload = parsePayload(payloads, attribute, target)
  const element = payload?.anchor ? (resolveAnchor(target, payload.anchor) ?? target) : target
  return { element, payload, trigger: target }
}

/**
 * A per-instance label authored as a CSS custom property on the scope element.
 * A custom property rather than an attribute because that is the channel a host's
 * own styling machinery writes — Elementor's `selectors` update it live in the
 * editor preview, where an attribute printed by PHP never lands (the editor
 * builds the element itself). Surrounding quotes as authored are stripped; an
 * unset property reads as ''.
 */
export const readCssLabel = (el: Element, property: string): string => {
  const raw = getComputedStyle(el).getPropertyValue(property).trim()
  return raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw
}

/** True when a rule takes anything per-instance off the hovered element. */
export const isTuned = (rule: ICompiledRule): boolean =>
  Boolean(rule.labelVar || rule.iconVar || rule.stateVars)

/**
 * The rule's payload carrying whichever STATE its `stateVars` resolve to on this
 * instance. An unset property leaves the key alone — the rule's own value
 * stands; the literal `none` DROPS it, which is the only way an instance can
 * turn off something the rule states. An absent property could never say that:
 * custom properties inherit, so a nested scope with nothing of its own reads its
 * ancestor's value, which is exactly the case this channel exists to get right.
 *
 * Values are written through unvalidated. They land as `data-cursor-*` state
 * attributes whose styling keys on known tokens, so an unknown one is inert —
 * cheaper than a validation table that would have to be kept in step with the
 * stylesheet. Returns the rule's own payload when nothing resolved, so the
 * common path allocates nothing.
 */
export const withStateVars = (rule: ICompiledRule, scopeEl: Element): ICursorPayload => {
  if (!rule.stateVars) {
    return rule.payload
  }
  let payload: ICursorPayload | null = null
  for (const [key, property] of Object.entries(rule.stateVars)) {
    const value = readCssLabel(scopeEl, property)
    if (!value) {
      continue
    }
    payload ??= { ...rule.payload }
    if (value === 'none') {
      delete payload[key as TStateVarKey]
    } else {
      // The cast is the channel's contract: a custom property carries a token,
      // and TStateVarKey is closed to keys whose payload type IS that token.
      ;(payload as Record<TStateVarKey, string>)[key as TStateVarKey] = value
    }
  }
  return payload ?? rule.payload
}

/** Which icon form a resolved var holds. One property carries both because a
    host substitutes a single value per property — so the value itself says what
    it is: a `url(…)` can be masked and recoloured, anything else is class names
    for a webfont glyph. */
export const asIcon = (value: string): Pick<ICursorPayload, 'iconUrl' | 'iconClass'> => {
  // Unwrapped down to the bare URL, because `iconUrl` means a URL to every other
  // consumer — a payload authored in JS passes one plainly, and the applier is
  // what puts it back inside a `url()`. Keeping the CSS form here would nest one
  // inside another and the mask would resolve to nothing.
  const url = value.match(/^url\(\s*["']?(.*?)["']?\s*\)$/)
  return url?.[1] ? { iconUrl: url[1] } : { iconClass: value }
}

/** The rule's payload carrying whichever per-instance content its vars resolve to
    — read fresh per crossing, since the whole point is to track a live edit.
    State resolves FIRST, so the icon branch below still gets the last word on
    `shape`: an instance asking for a pill and an icon must land where a rule
    asking for both already does.

    The two vars are an EITHER/OR the host picked between, not a pair to combine,
    so a resolved icon REPLACES the wording — including the rule's own fallback,
    which would otherwise sit beside it. With no text left to hug, the pill goes
    back to a circle: a stadium exists to fit a word, and a lone glyph in one
    reads as a mistake. A rule wanting an icon *beside* wording states it in the
    payload instead; this channel is only ever one or the other. */
export const withCssContent = (rule: ICompiledRule, scopeEl: Element): ICursorPayload => {
  const base = withStateVars(rule, scopeEl)
  const label = rule.labelVar ? readCssLabel(scopeEl, rule.labelVar) : ''
  const icon = rule.iconVar ? readCssLabel(scopeEl, rule.iconVar) : ''
  if (!label && !icon) {
    return base
  }
  const payload = { ...base }
  if (label) {
    payload.label = label
  }
  if (icon) {
    Object.assign(payload, asIcon(icon))
    delete payload.label
    delete payload.shape
    // Sized by the host rather than by the rule, since how big a cursor should
    // grow for an icon is a site-wide look. floorScale treats it as a floor, so
    // it never clips an icon larger than the size asked for.
    const size = readCssLabel(scopeEl, HINT_CURSOR_SIZE_VAR)
    if (size) {
      payload.scale = size
    }
  }
  return payload
}

/**
 * One rule against one hovered element. The anchor is resolved within the
 * hovered scope INSTANCE and BECOMES the effect element (magnetic pull, snap
 * and resize all key off it); an anchor that names nothing drops the rule, so
 * the element falls back to its regular behavior — hence null rather than a
 * context with the trigger in it. A rule naming content vars reads them off the
 * scope element, so one instance can carry its own wording.
 */
export const matchRule = (target: Element, rule: ICompiledRule): ITargetContext | null => {
  const trigger = target.closest(rule.trigger)
  if (!trigger) {
    return null
  }
  if (!rule.anchor && !isTuned(rule)) {
    return { element: trigger, payload: rule.payload, trigger }
  }
  const scopeEl = trigger.closest(rule.scope) ?? trigger
  const payload = isTuned(rule) ? withCssContent(rule, scopeEl) : rule.payload
  if (!rule.anchor) {
    return { element: trigger, payload, trigger }
  }
  const anchorEl = resolveAnchor(scopeEl, rule.anchor)
  return anchorEl ? { element: anchorEl, payload, trigger } : null
}

export function createTargets(args: {
  attribute: string
  scopes: ITargetScope[]
  /** Gate: a rule whose effect is globally off is treated as if it doesn't
      exist — dropped from both matching and payload, so the element falls back
      to its regular behavior (a link still highlights). Defaults to always on. */
  isRuleActive?: (rule: ITargetRule) => boolean
  signal: AbortSignal
}): ITargets {
  const base = `${INTERACTIVE_SELECTOR}, [${args.attribute}]`
  const isRuleActive = args.isRuleActive ?? (() => true)

  const compiled: ICompiledRule[] = []
  for (const group of args.scopes) {
    for (const rule of group.rules) {
      compiled.push({
        scope: group.scope,
        trigger: ruleTrigger(group.scope, rule),
        anchor: rule.payload.anchor,
        payload: rule.payload,
        source: rule,
        labelVar: rule.labelVar,
        iconVar: rule.iconVar,
        stateVars: rule.stateVars,
        active: true
      })
    }
  }

  // Active-rule cache: `selector` and `activeRules` reflect only rules whose
  // effect is currently enabled. Recomputed per crossing, but the selector is
  // rebuilt only when a toggle actually flips — steady state is n boolean
  // compares, no allocation.
  let activeRules = compiled
  let selector = base
  const rebuildActive = () => {
    activeRules = compiled.filter((rule) => rule.active)
    const rs = activeRules.map((r) => r.trigger).join(', ')
    selector = rs ? `${base}, ${rs}` : base
  }
  const refreshActive = (): boolean => {
    let changed = false
    for (const rule of compiled) {
      const on = isRuleActive(rule.source)
      if (on !== rule.active) {
        rule.active = on
        changed = true
      }
    }
    if (changed) {
      rebuildActive()
    }
    return changed
  }
  rebuildActive()

  const payloads = new WeakMap<Element, ICursorPayload | null>()
  const events = createEmitter<ITargetEvents>()
  let current: ITargetContext | null = null

  /**
   * Resolve the effect element + payload for a pointer position. Precedence:
   * authored attribute > rule > bare interactive — except that a rule matched
   * on an ANCESTOR never outranks a target that is itself interactive: only a
   * rule whose trigger is the element itself can claim it, else it falls to a
   * later rule or the bare-interactive fallback. A rule's anchor is resolved
   * within the hovered scope instance and BECOMES the effect element (magnetic
   * pull, snap, resize all key off it); an anchor that doesn't resolve drops the
   * rule so the element falls back to its regular behavior. Returns null outside
   * every target or when opted out.
   */
  const resolveTarget = (from: Element | null): ITargetContext | null => {
    if (!from || from.closest?.(NO_TARGET_SELECTOR)) {
      return null
    }
    refreshActive()
    const target = from.closest?.(selector) ?? null
    if (!target) {
      return null
    }
    // Authored attribute (e.g. Velum markup) outranks every rule.
    if (target.getAttribute(args.attribute) !== null) {
      return authoredTarget(payloads, args.attribute, target)
    }
    // `base`'s `[attribute]` half can't hit here — the authored check above
    // already returned — so this is exactly "target is a built-in interactive
    // element", the same test the bare-interactive return below makes.
    const interactive = target.matches(base)
    for (const rule of activeRules) {
      const hit = matchRule(target, rule)
      // A rule matched on an ANCESTOR (closest() never descends, so a trigger
      // other than the target itself is one) never claims an interactive
      // element — skip it so a later rule naming the element itself, or the
      // fallback below, wins. Keeps a carousel's whole-widget drag rule from
      // swallowing a link nested in a slide.
      if (hit && (!interactive || hit.trigger === target)) {
        return hit
      }
    }
    // Bare interactive only if `target` is genuinely a built-in (link/button/
    // opt-in), not merely a rule trigger whose rule dropped — otherwise a
    // non-interactive trigger (e.g. an unlinked icon wrapper) would wrongly
    // highlight.
    return interactive ? { element: target, payload: null, trigger: target } : null
  }

  const leaveCurrent = () => {
    if (current) {
      const previous = current
      current = null
      events.emit('leave', previous)
    }
  }

  /** One crossing's pointerout resolve, handed to the pointerover completing
      it: both handlers resolve the SAME element (as relatedTarget, then as
      target), so the second pass is pure repetition. Consumed once; a rule
      toggle flipping between the two events invalidates it (refreshActive
      reports the flip), so the memo can never mask a Site Settings change. */
  let crossing: { el: Element; ctx: ITargetContext | null } | null = null

  document.addEventListener(
    'pointerover',
    (e) => {
      // Same gate as the engine's pointer source: these listeners live on the
      // lifecycle signal, not the media query, so a touch tap would otherwise
      // drive hover effects (and the magnetic element pull) from a stale
      // pointer position. Guard before the memo so an ignored crossing can
      // neither consume nor corrupt it.
      if (!accepts(e)) {
        return
      }
      const from = e.target as Element | null
      const memo = crossing
      crossing = null
      const hit = memo && memo.el === from && !refreshActive() ? memo.ctx : resolveTarget(from)
      if (!hit) {
        leaveCurrent()
        return
      }
      if (current?.element === hit.element) {
        return
      }
      leaveCurrent()
      current = hit
      events.emit('enter', current)
    },
    { passive: true, signal: args.signal }
  )

  document.addEventListener(
    'pointerout',
    (e) => {
      if (!accepts(e) || !current) {
        return
      }
      const related = e.relatedTarget as Element | null
      const next = resolveTarget(related)
      crossing = related ? { el: related, ctx: next } : null
      if (next?.element !== current.element) {
        leaveCurrent()
      }
    },
    { passive: true, signal: args.signal }
  )

  return {
    get current() {
      return current
    },
    on: events.on,
    handleDown() {
      if (current) {
        events.emit('press', current)
      }
    },
    handleUp() {
      if (current) {
        events.emit('release', current)
      }
    }
  }
}
