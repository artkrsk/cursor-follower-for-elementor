import type { ICursorPayload } from '../interfaces/ICursorPayload'

/** The sub-payload composed only while a primary press is held over a target.
    Like drag, it has no element to resolve, and it cannot nest further
    gesture states. */
export type TPressPayload = Omit<ICursorPayload, 'anchor' | 'magnetic' | 'drag' | 'press'>
