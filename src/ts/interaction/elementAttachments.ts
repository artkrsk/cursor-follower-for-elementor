import type {
  ICursorElementOptions,
  ICursorPayload,
  ICursorSession,
  IResolvedOptions,
  ITickerAdapter,
  IVec2
} from '../interfaces'
import { createElementAttachment } from './elementAttachment'

/** One lazy registry per cursor, with one ticker subscription and ownership arbiter. */
export function createElementAttachments(args: {
  options: IResolvedOptions
  ticker: ITickerAdapter
  pointer: IVec2
  root: () => HTMLElement | null
  enabled: () => boolean
  seen: () => boolean
  session: (payload: ICursorPayload) => ICursorSession
}) {
  const bindings = new Set<ReturnType<typeof createElementAttachment>>()
  const lifecycle = new AbortController()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let owner: ReturnType<typeof createElementAttachment> | null = null
  let stop: (() => void) | null = null
  let initial = false
  let disposed = false
  let suspended = false

  const reconcile = (target: Element | null) => {
    let winner: ReturnType<typeof createElementAttachment> | null = null
    let trigger: HTMLElement | null = null
    if (target?.tagName !== 'IFRAME')
      for (const binding of bindings) {
        const match = binding.match(target)
        if (match && (!trigger || trigger.contains(match))) {
          winner = binding
          trigger = match
        }
      }
    if (owner !== winner) owner?.leave()
    owner = winner
    if (winner && trigger) winner.enter(trigger)
  }
  const refresh = () => {
    if (!args.seen() || document.hidden || suspended) return
    reconcile(document.elementFromPoint(args.pointer.x, args.pointer.y))
  }
  const wake = () => {
    if (stop || disposed) return
    stop = args.ticker.subscribe(
      (_time, dt, count) => {
        if (disposed) return
        if (initial) {
          initial = false
          refresh()
        }
        for (const binding of bindings) if (binding.busy) binding.measure()
        for (const binding of bindings) if (binding.busy) binding.frame(dt, count)
        let busy: boolean = initial
        for (const binding of bindings) if (binding.busy) busy = true
        if (!busy) {
          stop?.()
          stop = null
        }
      },
      { priority: 1, label: 'arts-cursor/elements' }
    )
  }
  const clear = () => {
    suspended = true
    owner = null
    for (const binding of bindings) binding.settle()
  }
  window.addEventListener('blur', clear, { signal: lifecycle.signal })
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) clear()
    },
    { signal: lifecycle.signal }
  )
  window.addEventListener(
    'pointerout',
    (event) => {
      if (event.relatedTarget === null) reconcile(null)
    },
    { signal: lifecycle.signal, passive: true }
  )
  window.addEventListener(
    'resize',
    () => {
      for (const binding of bindings) binding.remeasure()
      refresh()
    },
    { signal: lifecycle.signal, passive: true }
  )
  reduced.addEventListener(
    'change',
    () => {
      for (const binding of bindings) binding.reduce()
      refresh()
    },
    { signal: lifecycle.signal }
  )
  return {
    attach(config: ICursorElementOptions) {
      for (const binding of bindings)
        if (binding.element === config.element) {
          throw new Error('This element already has a cursor attachment')
        }
      // Validate delegated selectors before allocating resources or touching DOM.
      if ('root' in config.trigger) config.trigger.root.matches(config.trigger.selector)
      const binding = createElementAttachment({
        ...args,
        config,
        reduced: () => reduced.matches,
        wake,
        remove: () => {
          bindings.delete(binding)
          if (owner === binding) owner = null
          if (bindings.size === 0) {
            initial = false
            stop?.()
            stop = null
          }
        }
      })
      bindings.add(binding)
      initial = true
      wake()
      return binding.api
    },
    move(event: PointerEvent) {
      suspended = false
      for (const binding of bindings) binding.acceptInput()
      const target = event.target
      reconcile(
        target && 'nodeType' in target && target.nodeType === 1 ? (target as Element) : null
      )
    },
    refresh,
    remeasure() {
      for (const binding of bindings) binding.remeasure()
    },
    disable: clear,
    destroy() {
      disposed = true
      stop?.()
      lifecycle.abort()
      for (const binding of bindings) binding.api.destroy()
      bindings.clear()
      owner = null
    }
  }
}
