import type { ICursorSession } from '../interfaces'

// Explicit-resource-management support on older runtimes.
;(Symbol as { dispose?: symbol }).dispose ??= Symbol('Symbol.dispose')

export const createSession = (release: () => void): ICursorSession => ({
  release,
  [Symbol.dispose]: release
})
