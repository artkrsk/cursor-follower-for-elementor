import {
  DEFAULT_COLLAPSE_EASING,
  DEFAULT_EASING,
  DEFAULT_ELASTIC_MAX,
  DEFAULT_ELASTIC_STRENGTH,
  HINT_OFFSET_X,
  HINT_OFFSET_Y
} from '../constants'
import { createEmitter } from '../core/emitter'
import { createFrameState } from '../core/frameState'
import { resolveEasing } from '../follower/easing'
import { createElastic } from '../follower/elastic'
import { createElementLayer } from '../follower/elementLayer'
import { createFollowerPipeline } from '../follower/pipeline'
import type {
  ICursorElementAttachment,
  ICursorElementEvents,
  ICursorElementOptions,
  ICursorPayload,
  ICursorSession,
  IResolvedOptions,
  ITransformWriter,
  IVec2
} from '../interfaces'

const returnEase = resolveEasing('ease-out')

/** One attachment's state; the manager owns input arbitration and the shared frame. */
export function createElementAttachment(args: {
  config: ICursorElementOptions
  options: IResolvedOptions
  pointer: IVec2
  root: () => HTMLElement | null
  reduced: () => boolean
  enabled: () => boolean
  session: (payload: ICursorPayload) => ICursorSession
  wake: () => void
  remove: () => void
}) {
  const { config, options } = args
  const home = config.rest !== 'hidden'
  const scope = 'root' in config.trigger ? config.trigger.root : config.trigger
  const events = createEmitter<ICursorElementEvents>()
  const layer = createElementLayer(config)
  const state = createFrameState()
  const local = { x: 0, y: 0 }
  const progress = { x: 0, y: 0 }
  const delta = { x: 0, y: 0 }
  const pointer = { ...args.pointer }
  const previousPointer = { ...args.pointer }
  let interaction = new AbortController()
  interaction.abort()
  const view = {
    trigger: null as HTMLElement | null,
    pointer,
    position: state.follower,
    delta,
    local,
    progress,
    deltaTime: 0,
    frameCount: 0,
    reveal: home ? 1 : 0,
    signal: interaction.signal
  }
  let entered = false
  let following = false
  let paused = false
  let hidden = false
  let destroyed = false
  let waitForInput = false
  let claim: ICursorSession | undefined
  let duration = options.animation.duration
  let ease = resolveEasing(DEFAULT_EASING)
  let collapse = resolveEasing(DEFAULT_COLLAPSE_EASING)
  let offsetX = HINT_OFFSET_X
  let offsetY = HINT_OFFSET_Y
  let bounds: DOMRect | null = null
  let transition: {
    elapsed: number
    x: number
    y: number
    lagX: number
    lagY: number
    from: number
    to: number
    returning: boolean
  } | null = null
  const feel = { elastic: options.elastic }
  const elasticOverride = { strength: 0, max: 0 }
  const writer: ITransformWriter = {
    setTranslate: (x, y) => layer.writer?.setTranslate(x, y),
    setElastic: (x, y, c, s) => layer.writer?.setElastic(x, y, c, s),
    resetElastic: () => layer.writer?.resetElastic(),
    flush: () => {}
  }
  const elastic = createElastic({ state, writer, options: feel })
  const pipeline = createFollowerPipeline({
    state,
    getTrailing: () => Math.max(0, Math.min(1, config.trailing ?? options.trailing)),
    composeTarget: () => {
      state.target.x = args.pointer.x + offsetX
      state.target.y = args.pointer.y + offsetY
    },
    renderPosition: () => {},
    applyElastic: () => elastic.frame(),
    flush: () => {},
    mayIdle: () => true,
    onConverged: () => {}
  })
  const read = () => {
    const root = args.root()
    const style = root ? getComputedStyle(root) : null
    const token = (name: string) => style?.getPropertyValue(`--arts-cursor-${name}`).trim() ?? ''
    const cssDuration = token('duration')
    const parsed = Number.parseFloat(cssDuration)
    duration = Math.max(
      0,
      config.animation?.duration ??
        (Number.isFinite(parsed) && cssDuration.endsWith('s')
          ? parsed / (cssDuration.endsWith('ms') ? 1000 : 1)
          : options.animation.duration)
    )
    ease = resolveEasing(
      config.animation?.easing ?? (token('ease') || options.animation.easing || DEFAULT_EASING)
    )
    collapse = resolveEasing(token('collapse-ease') || DEFAULT_COLLAPSE_EASING)
    const x = Number.parseFloat(token('hint-offset-x'))
    const y = Number.parseFloat(token('hint-offset-y'))
    offsetX = config.offset?.[0] ?? (Number.isFinite(x) ? x : HINT_OFFSET_X)
    offsetY = config.offset?.[1] ?? (Number.isFinite(y) ? y : HINT_OFFSET_Y)
  }
  const setFollowing = (value: boolean) => {
    if (following === value) return
    following = value
    events.emit('following:change', value)
  }
  const release = () => {
    claim?.release()
    claim = undefined
  }
  const prepare = () => {
    if (layer.floating) return
    const box = layer.measure()
    state.follower.x = home ? box.x : args.pointer.x + offsetX
    state.follower.y = home ? box.y : args.pointer.y + offsetY
    state.lag.x = 0
    state.lag.y = 0
    layer.float()
    layer.render(state.follower.x, state.follower.y, view.reveal)
  }
  const complete = () => {
    if (!transition) return
    const { to, returning } = transition
    if (returning && home) {
      const box = layer.box
      state.follower.x = box.x
      state.follower.y = box.y
    }
    view.reveal = to
    transition = null
    if (returning || to === 0) {
      layer.dock()
      layer.visibility(to > 0)
    }
  }
  const animate = (to: number, returning: boolean) => {
    prepare()
    transition = {
      elapsed: 0,
      x: state.follower.x,
      y: state.follower.y,
      lagX: state.lag.x,
      lagY: state.lag.y,
      from: view.reveal,
      to,
      returning
    }
    if (args.reduced() || duration === 0) complete()
    args.wake()
  }
  const endInteraction = () => {
    if (!entered) return
    entered = false
    interaction.abort()
    release()
    setFollowing(false)
    events.emit('leave', view)
  }
  const leave = () => {
    if (!entered || destroyed) return
    endInteraction()
    if (destroyed) return
    if (home && !hidden && !layer.floating) return
    animate(hidden || !home ? 0 : 1, home)
  }
  const updatePointer = () => {
    pointer.x = args.pointer.x
    pointer.y = args.pointer.y
    if (!bounds) return
    const x = pointer.x - bounds.left
    const y = pointer.y - bounds.top
    const target = view.trigger
    local.x = x * ((target?.offsetWidth ?? 0) / (bounds.width || 1) || 1)
    local.y = y * ((target?.offsetHeight ?? 0) / (bounds.height || 1) || 1)
    progress.x = bounds.width > 0 ? Math.max(0, Math.min(1, x / bounds.width)) : 0
    progress.y = bounds.height > 0 ? Math.max(0, Math.min(1, y / bounds.height)) : 0
  }
  if (!home) layer.visibility(false)
  read()
  const api: ICursorElementAttachment = {
    get following() {
      return following
    },
    on: events.on,
    pause() {
      if (destroyed) return
      paused = true
      leave()
    },
    resume() {
      if (destroyed) return
      paused = false
      waitForInput = true
    },
    hide({ position = 'home' } = {}) {
      if (destroyed || hidden) return
      hidden = true
      endInteraction()
      if (!destroyed) {
        read()
        animate(0, home && position === 'home')
      }
    },
    show() {
      if (destroyed || !hidden) return
      hidden = false
      waitForInput = true
      read()
      // A hidden-at-rest preview stays hidden until the next eligible entry.
      if (home) animate(1, true)
    },
    destroy(revert = true) {
      if (destroyed) return
      destroyed = true
      entered = false
      following = false
      interaction.abort()
      release()
      transition = null
      layer.destroy(revert)
      args.remove()
    }
  }
  return {
    api,
    scope,
    element: config.element,
    get busy() {
      return !destroyed && (entered || transition !== null)
    },
    acceptInput() {
      waitForInput = false
    },
    match(target: Element | null): HTMLElement | null {
      if (destroyed || paused || hidden || waitForInput || !args.enabled() || !target) return null
      if ('root' in config.trigger) {
        const matched = target.closest<HTMLElement>(config.trigger.selector)
        return matched && scope.contains(matched) ? matched : null
      }
      return scope.contains(target) ? scope : null
    },
    enter(target: HTMLElement) {
      if (destroyed) return
      const previous = view.trigger
      const changed = !entered || previous !== target
      if (changed) {
        interaction.abort()
        interaction = new AbortController()
        view.signal = interaction.signal
        view.trigger = target
        bounds = target.getBoundingClientRect()
        updatePointer()
        previousPointer.x = pointer.x
        previousPointer.y = pointer.y
        delta.x = delta.y = 0
        read()
        const wasEntered = entered
        entered = true
        if (config.cursor !== false && !claim)
          claim = args.session({
            hidden: true,
            hideNativeCursor: false,
            showProgressCursor: false,
            dot: false,
            ...config.cursor
          })
        if (wasEntered && previous) events.emit('target:change', view, previous)
        else events.emit('enter', view)
        if (destroyed || !entered) return
      }
      const shouldFollow = config.follow !== false && !args.reduced()
      if (shouldFollow && !following) {
        prepare()
        transition = null
        setFollowing(true)
      }
      if (destroyed || !entered) return
      if (!home && changed && view.reveal < 1) animate(1, false)
      args.wake()
    },
    leave,
    remeasure: read,
    settle() {
      leave()
      complete()
    },
    reduce() {
      if (!args.reduced()) return
      setFollowing(false)
      if (layer.floating) animate(home && !hidden ? 1 : 0, home)
      complete()
    },
    measure() {
      if (destroyed) return
      layer.measure()
      bounds = view.trigger?.getBoundingClientRect() ?? null
    },
    frame(dt: number, frameCount: number) {
      if (destroyed || (!entered && !transition)) return
      view.deltaTime = dt
      view.frameCount = frameCount
      updatePointer()
      delta.x = pointer.x - previousPointer.x
      delta.y = pointer.y - previousPointer.y
      previousPointer.x = pointer.x
      previousPointer.y = pointer.y
      if (entered && (delta.x !== 0 || delta.y !== 0)) events.emit('move', view)
      if (destroyed) return
      const base = options.elastic
      if (config.elastic && typeof config.elastic === 'object') {
        elasticOverride.strength =
          config.elastic.strength ?? (base ? base.strength : DEFAULT_ELASTIC_STRENGTH)
        elasticOverride.max = config.elastic.max ?? (base ? base.max : DEFAULT_ELASTIC_MAX)
        feel.elastic = elasticOverride
      } else feel.elastic = config.elastic === false ? false : base
      if (following) pipeline.frame(dt)
      if (transition) {
        const t = transition
        t.elapsed += Math.max(0, dt)
        const p = duration === 0 ? 1 : Math.min(1, t.elapsed / (duration * 1000))
        const k = t.to < t.from ? collapse(p) : ease(p)
        view.reveal = Math.max(0, t.from + (t.to - t.from) * k)
        if (t.returning && home) {
          const box = layer.box
          const r = returnEase(p)
          state.follower.x = t.x + (box.x - t.x) * r
          state.follower.y = t.y + (box.y - t.y) * r
          state.lag.x = t.lagX * (1 - r)
          state.lag.y = t.lagY * (1 - r)
          elastic.frame()
        }
        if (p === 1) complete()
      }
      layer.render(state.follower.x, state.follower.y, view.reveal)
      events.emit('frame', view)
    }
  }
}
