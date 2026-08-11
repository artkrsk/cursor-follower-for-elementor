import type { ICursorPayload } from '../interfaces/ICursorPayload'

/** The sub-payload pushed while a click-drag is held. Narrower than the parent
    on purpose: a drag reaches the cursor through a SESSION, and sessions carry
    no element, so `anchor` and `magnetic` have nothing to resolve against and a
    further nested `drag` is never consulted. Accepting them would let a payload
    state something that silently does nothing. */
export type TDragPayload = Omit<ICursorPayload, 'anchor' | 'magnetic' | 'drag'>
