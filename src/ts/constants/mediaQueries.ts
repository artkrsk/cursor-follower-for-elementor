/** The capability gate, shared by core/input.ts (listener lifecycle) and
    gate.ts (load trigger) so the two can never disagree on what counts as a
    fine-pointer device. */
export const POINTER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)'
