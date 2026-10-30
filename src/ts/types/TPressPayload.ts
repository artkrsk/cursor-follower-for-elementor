import type { ICursorPayload } from '../interfaces/ICursorPayload'

/** The sub-payload composed only while a primary press is held over a target.
    Narrowed like drag: it overlays a hover whose `anchor` and `magnetic` were
    already resolved on enter from the base payload, so those keys are never
    read from here, and it cannot nest further gesture states. */
export type TPressPayload = Omit<ICursorPayload, 'anchor' | 'magnetic' | 'drag' | 'press'>
