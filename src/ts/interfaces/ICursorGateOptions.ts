export interface ICursorGateOptions {
  css: string
  /** Classic WordPress bootstrap URL; use load for a module bootstrap. */
  js?: string
  /** Called after CSS loads; pass the captured signal to createCursorApp. */
  load?: (signal: AbortSignal) => Promise<void>
  editor?: boolean
}
