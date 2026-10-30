import { vi } from 'vitest'

/**
 * Force the shipped code path: the engine guards its dev-only diagnostics with
 * `import.meta.env?.DEV` (optional access is deliberate, see env.d.ts), so the
 * flag is stubbed to false here and the tests run the branches that ship.
 */
vi.stubEnv('DEV', false)
