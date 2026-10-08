/** WordPress pre-paint adapter; replayed head scripts must not replace a live owner. */
import { createCursorGate } from './createCursorGate'

if (!window.artsCursor) {
  createCursorGate(window.artsCursorFollowerBoot).init()
}
