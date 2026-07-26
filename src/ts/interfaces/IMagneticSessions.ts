import type { TStyledElement } from '../types/TStyledElement'
import type { ICursorPayload } from './ICursorPayload'
import type { ICursorSession } from './ICursorSession'
import type { IMagneticController } from './IMagneticController'
import type { IMagnetizeOptions } from './IMagnetizeOptions'

/**
 * Owns which magnetic engagement is active. A programmatic magnetize() session
 * supersedes hover: while one is held, hover enter/leave must not touch the
 * trap, and it may override trailing per frame.
 */
export interface IMagneticSessions {
  /** The trap itself — driven by the frame path. */
  readonly controller: IMagneticController
  /** Live session's per-frame trailing, or null for the configured value. */
  trailingOverride(): number | null
  /** `element` is the already-resolved anchor (targets.ts redirects a rule's
      scope-relative anchor into the effect element before this point);
      `trigger` is the hover zone that fired the engagement — its rect bounds
      the trap's distance release. */
  engageHover(element: TStyledElement, payload: ICursorPayload, trigger: Element): void
  releaseHover(): void
  magnetize(opts: IMagnetizeOptions): ICursorSession
  dispose(): void
}
