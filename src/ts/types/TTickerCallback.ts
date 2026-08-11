/** Callback shape shared with tempus/@arts/component-runtime tickers (structural match). */
export type TTickerCallback = (time: number, deltaTime: number, frameCount: number) => void
