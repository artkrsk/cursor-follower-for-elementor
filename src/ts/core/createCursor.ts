import { VISIBLE_ATTR } from '../constants'
import { createMagneticSessions } from '../effects/magneticSessions'
import { createEffectsSuite } from '../effects/suite'
import { createMotion } from '../follower/motion'
import { createDragSessions } from '../interaction/dragSessions'
import { createGeometryCache } from '../interaction/geometry'
import { createTargets, geometrySelector, resolveAnchor } from '../interaction/targets'
import type {
  ICursorEvents,
  ICursorFollower,
  ICursorOptions,
  ICursorPayload,
  ICursorRefs,
  IDragSessions,
  IEffectsSuite,
  IGeometryCache,
  IMagneticSessions,
  IMotionSystem,
  IPointerInput,
  IResolvedOptions,
  ITargetContext,
  ITargetRule,
  ITargets
} from '../interfaces'
import { isStyledElement } from '../utils'
import { createEmitter } from './emitter'
import { createFrameState, createScrollReader } from './frameState'
import { createPointerInput } from './input'
import { applyAnimationTokens, buildMarkup, readAnimationTokens, setActiveClasses } from './markup'
import { applyOptionPatch, resolveOptions } from './options'
import { createSession } from './session'
import { createInternalTicker } from './ticker'

/**
 * Gate a rule by its effect's global toggle: a magnetic rule is inert (and
 * drops to regular behavior — a link still highlights) while Magnetic is off.
 * Reads the live options object, so it tracks updateOptions.
 */
export const ruleEnabled = (rule: ITargetRule, options: IResolvedOptions): boolean => {
  const p = rule.payload
  if (p.magnetic != null && options.magnetic === false) {
    return false
  }
  if (p.highlight != null && options.highlight === false) {
    return false
  }
  return true
}

/** The payload's magnetic anchor, if any — a throwaway parse for warm() only. The
    memoized parse lives in interaction/targets.ts and fires on first hover; warming
    a handful of elements at idle doesn't warrant sharing that WeakMap. */
const anchorOf = (raw: string | null): string | undefined => {
  if (!raw) {
    return undefined
  }
  try {
    return (JSON.parse(raw) as ICursorPayload).anchor
  } catch {
    return undefined
  }
}

/**
 * The elements warm() should pre-measure so no first hover pays a synchronous
 * layout: every authored `[attribute]` element and the anchor it may redirect the
 * effect to, plus everything matching the compiled rule geometry selector. Deduped.
 */
export const collectWarmTargets = (
  root: ParentNode,
  attribute: string,
  ruleSelector: string
): Set<Element> => {
  const out = new Set<Element>()
  for (const el of root.querySelectorAll(`[${attribute}]`)) {
    out.add(el)
    const anchor = anchorOf(el.getAttribute(attribute))
    const resolved = anchor ? resolveAnchor(el, anchor) : null
    if (resolved) {
      out.add(resolved)
    }
  }
  if (ruleSelector) {
    for (const el of root.querySelectorAll(ruleSelector)) {
      out.add(el)
    }
  }
  return out
}

export function createCursor(userOptions: ICursorOptions = {}): ICursorFollower {
  const options = resolveOptions(userOptions)
  const ticker = userOptions.ticker ?? createInternalTicker()
  // Compiled once — targetScopes is wired at init and never patched.
  const warmSelector = geometrySelector(options.targetScopes)

  const state = createFrameState()
  const stats = { frameMs: 0, active: false, lag: 0 }
  const events = createEmitter<ICursorEvents>()
  // The one place that resolves the documentElement — everything below is handed a target.
  const html = document.documentElement

  let refs: ICursorRefs | null = null
  let lifecycle: AbortController | null = null
  let motion: IMotionSystem | null = null
  let geometry: IGeometryCache | null = null
  let targets: ITargets | null = null
  let magnetics: IMagneticSessions | null = null
  let suite: IEffectsSuite | null = null
  let drag: IDragSessions | null = null
  let input: IPointerInput | null = null

  const onEnabledChange = (enabled: boolean) => {
    setActiveClasses(html, enabled)
    if (!enabled) {
      refs?.root.removeAttribute(VISIBLE_ATTR)
      state.pointerSeen = false
      motion?.sleep()
    }
    events.emit('enabled:change', enabled)
  }

  const api: ICursorFollower = {
    init() {
      if (lifecycle) {
        return
      }
      lifecycle = new AbortController()
      // Passive scroll listener seeds and maintains state.scroll; its lifecycle
      // rides this controller, like input and targets.
      const readScroll = createScrollReader(state, lifecycle.signal)

      refs = buildMarkup(userOptions.root)
      // Only explicitly configured tokens go inline (the raw user options know
      // the difference; the resolved ones don't) — then options.animation is
      // re-derived from computed CSS, so the JS timings (clear delay, the
      // magnetic element's transition) follow whatever wins the cascade: the
      // kit Duration control, a theme var, the stylesheet default, or the
      // inline write itself.
      applyAnimationTokens(refs.root, userOptions.animation)
      Object.assign(options.animation, readAnimationTokens(refs.root))

      geometry = createGeometryCache()
      geometry.warm(collectWarmTargets(document, options.attribute, warmSelector))
      suite = createEffectsSuite({ refs, options, geometry, html })

      magnetics = createMagneticSessions({
        root: refs.root,
        state,
        geometry,
        options,
        suite,
        readScroll,
        wake: () => motion?.wake()
      })
      motion = createMotion({
        root: refs.root,
        state,
        stats,
        options,
        ticker,
        readScroll,
        magnetic: magnetics.controller,
        getTrailingOverride: () => magnetics?.trailingOverride() ?? null
      })

      targets = createTargets({
        attribute: options.attribute,
        scopes: options.targetScopes,
        isRuleActive: (rule) => ruleEnabled(rule, options),
        signal: lifecycle.signal
      })
      // A drag locks the cursor to its own state: while it's active, hovering an
      // arrow/dot/link must NOT engage magnetic or highlight. So the hover
      // effects are gated on the drag being idle — extracted so a drag's end can
      // resync to whatever the pointer landed on.
      const enterTarget = (ctx: ITargetContext) => {
        suite?.setHover(ctx.payload ?? {}, ctx.element)
        if (ctx.payload?.magnetic && isStyledElement(ctx.element)) {
          magnetics?.engageHover(ctx.element, ctx.payload, ctx.trigger)
        }
        events.emit('target:enter', ctx)
      }
      targets.on('enter', (ctx) => {
        if (!drag?.isDragging) {
          enterTarget(ctx)
        }
      })
      targets.on('leave', (ctx) => {
        if (!drag?.isDragging) {
          suite?.clearHover()
          magnetics?.releaseHover()
          events.emit('target:leave', ctx)
        }
      })

      drag = createDragSessions({
        suite,
        targets,
        root: refs.root,
        onDragEnd: (ctx) => {
          if (ctx) {
            enterTarget(ctx)
          } else {
            suite?.clearHover()
            magnetics?.releaseHover()
          }
        }
      })

      // Initial paint at viewport center, hidden until the first real move.
      motion.snap()

      input = createPointerInput({
        signal: lifecycle.signal,
        onMove: (e) => {
          if (!state.pointerSeen) {
            // Materialize at the pointer: snap silently, then reveal — no glide-in.
            state.pointerSeen = true
            motion?.snapTo(e.clientX, e.clientY)
            refs?.root.setAttribute(VISIBLE_ATTR, '')
          } else {
            motion?.setPointer(e.clientX, e.clientY)
          }
          drag?.handleMove(e)
        },
        onDown: (e) => {
          const pressed = suite?.handlePress(e) ?? null
          // The engaged magnetic element mirrors the ring's click scale.
          if (pressed !== null) {
            magnetics?.controller.setPressedScale(pressed)
          }
          targets?.handleDown()
          drag?.handleDown(e)
        },
        onUp: (e) => {
          if (suite?.handleRelease(e)) {
            magnetics?.controller.setPressedScale(null)
          }
          targets?.handleUp()
          drag?.handleUp()
        },
        onEnabledChange
      })

      setActiveClasses(html, input.enabled)

      // The engine is live before the first paint of consumer code that
      // awaits it — announce on the document for load-order-proof discovery.
      document.dispatchEvent(new CustomEvent('arts-cursor:ready', { bubbles: true, detail: api }))
    },

    destroy() {
      if (!lifecycle) {
        return
      }
      motion?.dispose()
      lifecycle.abort()
      lifecycle = null
      state.pointerSeen = false
      magnetics?.dispose()
      magnetics = null
      suite?.dispose()
      suite = null
      geometry?.dispose()
      geometry = null
      targets = null
      drag = null
      input = null
      setActiveClasses(html, false)
      if (refs) {
        refs.root.removeAttribute(VISIBLE_ATTR)
        if (refs.built) {
          refs.root.remove()
        }
      }
      refs = null
      motion = null
    },

    set(payload: ICursorPayload) {
      // Magnetic needs a real element/anchor — payload.magnetic is ignored here.
      const release = suite?.addSession(payload) ?? (() => {})
      return createSession(release)
    },
    loading(opts) {
      return api.set({
        showLoadingAnimation: true,
        ...(opts?.size ? { scale: `${opts.size}px` } : {})
      })
    },
    progress() {
      return api.set({ showProgressCursor: true })
    },
    hideNativeCursor() {
      return api.set({ hideNativeCursor: true })
    },
    magnetize(opts) {
      return magnetics?.magnetize(opts) ?? createSession(() => {})
    },

    warm(container) {
      geometry?.warm(collectWarmTargets(container ?? document, options.attribute, warmSelector))
    },

    remeasure() {
      if (refs) {
        Object.assign(options.animation, readAnimationTokens(refs.root))
      }
      suite?.remeasure()
    },

    on: events.on,

    get enabled() {
      return input?.enabled ?? false
    },

    updateOptions(partial) {
      applyOptionPatch(options, partial)
    },

    get stats() {
      return stats
    },
    get el() {
      return refs?.root ?? null
    }
  }
  return api
}
