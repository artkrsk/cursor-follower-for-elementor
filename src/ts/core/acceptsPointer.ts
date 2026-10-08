/** Shared capability predicate; importing the gate must not pull in pointer listeners. */
export const accepts = (event: PointerEvent) =>
  event.pointerType === 'mouse' || event.pointerType === 'pen'
