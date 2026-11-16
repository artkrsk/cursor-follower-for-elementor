/** WordPress pre-paint adapter; replayed head scripts must not replace a live owner. */
import { createCursorGate } from './createCursorGate'

if (!window.artsCursor) {
  // The reduced-motion verdict rides the engine options PHP prints just above this script.
  const boot = window.artsCursorFollowerBoot
  const reducedMotion = window.artsCursorFollowerOptions?.reducedMotion
  createCursorGate(boot && reducedMotion === false ? { ...boot, reducedMotion } : boot).init()
}
