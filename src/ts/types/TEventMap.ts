/**
 * Emitter contract: every property of the map is a handler. Written as a
 * self-referential constraint (`M extends TEventMap<M>`) rather than a
 * `Record`, because plain interfaces — which is what the event maps are — have
 * no implicit index signature.
 */
export type TEventMap<M> = { [K in keyof M]: (...args: never[]) => void }
