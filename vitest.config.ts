import { createVitestConfig } from '@arts/wp-plugin-tooling/vitest'
import { defineConfig } from 'vitest/config'

// Shared shape (node env, @ts test-only alias, v8 coverage); see the tooling
// package for the rationale. The docs site carries its own Vite config
// (docs/.vitepress/config.mts) — this file configures Vitest alone.
export default defineConfig(
  createVitestConfig({ defineKey: '__ARTS_CURSOR_VERSION__', setupFiles: ['tests/ts/setup.ts'] })
)
