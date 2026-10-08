// Vite defines import.meta.env in the docs site; the esbuild plugin bundle
// substitutes import.meta.env.DEV via define (true in the dev channel, false
// in production, where the guarded blocks are dropped). Optional access keeps
// the checks safe in any bundler without the define.
interface ImportMetaEnv {
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
