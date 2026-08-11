import { vi } from 'vitest'

/**
 * Force the shipped code path. The engine guards its dev-only diagnostics with
 * `import.meta.env?.DEV`, and the optional access is deliberate (see env.d.ts) —
 * but Vite's `define` matches the literal `import.meta.env.DEV` member
 * expression only, so a define never reaches the `?.` form and every test used
 * to run the dev branches instead of the ones that ship. esbuild does substitute
 * the optional chain, so the plugin bundle was never affected; this closes the
 * gap on the Vitest side, where the value is a real runtime object.
 */
vi.stubEnv('DEV', false)
