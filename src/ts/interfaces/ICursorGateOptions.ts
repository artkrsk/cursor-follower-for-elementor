export interface ICursorGateOptions {
  css: string
  /** Classic WordPress bootstrap URL; use load for a module bootstrap. */
  js?: string
  /** Called after CSS loads; pass the captured signal to createCursorApp. */
  load?: (signal: AbortSignal) => Promise<void>
  /** Load immediately instead of waiting for the first pointer signal. */
  editor?: boolean
  /** The same verdict as the app's `reducedMotion` option, for the `<html>`
      prediction and the load trigger. Default true. */
  reducedMotion?: boolean
}
