declare global {
  interface SymbolConstructor {
    /** From TS lib `ESNext.Disposable` — declared here (an import-graph file,
        not the ambient global.d.ts) so consumers compiling this package's
        source without that lib still type ICursorSession's `using` support.
        Identical to the lib declaration, so both merge cleanly when present. */
    readonly dispose: unique symbol
  }
}

/**
 * A programmatic state claim. Sessions stack (last wins per property);
 * releasing restores whatever remains — other sessions or hover state.
 * Supports `using` (explicit resource management) via Symbol.dispose.
 */
export interface ICursorSession {
  release(): void
  [Symbol.dispose](): void
}
