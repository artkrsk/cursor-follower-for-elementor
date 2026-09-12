import type { ICursorElementFrame } from './ICursorElementFrame'

export interface ICursorElementEvents {
  enter: (frame: ICursorElementFrame) => void
  'target:change': (frame: ICursorElementFrame, previous: HTMLElement) => void
  move: (frame: ICursorElementFrame) => void
  frame: (frame: ICursorElementFrame) => void
  leave: (frame: ICursorElementFrame) => void
  'following:change': (following: boolean) => void
}
