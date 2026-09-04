/** Callback shape shared with `@arts/component-runtime`'s ITicker (structural
    match) and with tempus THROUGH 1.0.0-dev.17 — the version that package pins.
    tempus 1.0.0-dev.18 switched to a single `{ time, deltaTime, frame, budget }`
    state object, so a newer tempus is no longer a drop-in adapter. */
export type TTickerCallback = (time: number, deltaTime: number, frameCount: number) => void
