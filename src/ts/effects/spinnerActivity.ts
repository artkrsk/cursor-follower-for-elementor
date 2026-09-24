import { CLEAR_DELAY_PAD_MS, SPINNER_ACTIVE_ATTR } from '../constants'

/** Stop the paint-driven stroke animation as soon as its visible scale exit ends. */
export function createSpinnerActivity(root: HTMLElement, duration: () => number) {
  const spinner = root.querySelector('.arts-cursor__spinner')
  let cancelExit: (() => void) | null = null
  let generation = 0

  const stop = () => {
    generation++
    cancelExit?.()
    cancelExit = null
    root.removeAttribute(SPINNER_ACTIVE_ATTR)
  }

  return {
    start() {
      stop()
      root.setAttribute(SPINNER_ACTIVE_ATTR, '')
    },
    stop,
    collapse() {
      cancelExit?.()
      const current = ++generation
      const ms = duration() * 1000
      if (!spinner || ms <= 0) {
        stop()
        return
      }
      const done = () => {
        if (current === generation) stop()
      }
      const onEnd = (event: Event) => {
        if (event.target === spinner && (event as TransitionEvent).propertyName === 'scale') done()
      }
      const timeout = setTimeout(done, ms + CLEAR_DELAY_PAD_MS)
      spinner.addEventListener('transitionend', onEnd)
      cancelExit = () => {
        clearTimeout(timeout)
        spinner.removeEventListener('transitionend', onEnd)
      }
    }
  }
}
