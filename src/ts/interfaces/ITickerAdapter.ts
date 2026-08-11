import type { TTickerCallback } from '../types/TTickerCallback'
import type { ITickerSubscribeOptions } from './ITickerSubscribeOptions'

/**
 * Minimal frame-loop port. The engine never calls pause/play on an injected
 * ticker (global on tempus) — idling is done by unsubscribing.
 */
export interface ITickerAdapter {
  subscribe(cb: TTickerCallback, opts?: ITickerSubscribeOptions): () => void
}
