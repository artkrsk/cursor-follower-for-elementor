import type { ICursorOptions } from './ICursorOptions'

export interface ICursorAppOptions {
  options?: ICursorOptions
  /** Pass the gate's captured signal when initialization follows a deferred import. */
  signal?: AbortSignal
}
