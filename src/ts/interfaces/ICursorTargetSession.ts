import type { ICursorSession } from './ICursorSession'

/** A scoped pause of automatic target presentation. Explicit sessions remain owned by callers. */
export interface ICursorTargetSession extends ICursorSession {
  /** Finite magnetic element returns have restored their styles, or this lease was released. */
  readonly settled: Promise<void>
}
