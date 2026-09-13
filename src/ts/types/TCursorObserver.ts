import type { ICursorFollower } from '../interfaces/ICursorFollower'

export type TCursorObserver = (cursor: ICursorFollower | null) => void
