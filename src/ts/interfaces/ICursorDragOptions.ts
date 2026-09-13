import type { TCursorDragState } from '../types/TCursorDragState'

export interface ICursorDragOptions {
  getState: () => TCursorDragState
}
