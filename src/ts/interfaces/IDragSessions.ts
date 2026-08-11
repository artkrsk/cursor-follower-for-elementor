/**
 * The mouse-drag adapter. Driven by the engine's single pointer path — the
 * composition root fans pointerdown/move/up into these — so it holds no
 * listeners of its own. On a click-drag over a target that declares a `drag`
 * payload, it pushes that payload as a session for the drag's duration; when
 * the drag releases, it hands the hover resync to the factory's `onDragEnd`
 * callback with the target under the pointer.
 */
export interface IDragSessions {
  /** True while a drag session is active — the cursor is locked to its drag
      state, so the composition root gates hover effects on it being idle. */
  readonly isDragging: boolean
  handleDown(e: PointerEvent): void
  handleMove(e: PointerEvent): void
  handleUp(): void
}
