/** The capability gate. core/pointerMediaQuery.ts picks it or its full-motion
    twin for both core/input.ts (listener lifecycle) and createCursorGate.ts
    (load trigger), so the two can never disagree on when the cursor runs. */
export const POINTER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)'

/** The capability gate while reduced motion is honoured: a visitor whose system
    asks for it keeps the native cursor, and the gate follows that setting live. */
export const POINTER_FULL_MOTION_MEDIA_QUERY = `${POINTER_MEDIA_QUERY} and (prefers-reduced-motion: no-preference)`
