/**
 * Both fields stay optional by contract: the shape has to keep matching tempus
 * and `@arts/component-runtime`'s ITicker (see ITickerAdapter), and a host
 * ticker that ignores either one must remain a valid adapter.
 */
export interface ITickerSubscribeOptions {
  priority?: number
  label?: string
}
