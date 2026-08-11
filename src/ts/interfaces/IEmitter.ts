import type { TEventMap } from '../types/TEventMap'

export interface IEmitter<M extends TEventMap<M>> {
  /** Returns an unsubscribe function. */
  on<E extends keyof M>(event: E, cb: M[E]): () => void
  emit<E extends keyof M>(event: E, ...payload: Parameters<M[E]>): void
}
