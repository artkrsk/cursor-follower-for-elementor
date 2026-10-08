export interface ICursorGate {
  /** Arms capability detection and deferred loading. */
  init(): void
  /** Cancels pending loading and any app initialized with this signal. */
  destroy(): void
  readonly signal: AbortSignal
}
