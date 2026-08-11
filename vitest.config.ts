import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * The docs site carries its own Vite config (docs/.vitepress/config.mts);
 * this file configures Vitest alone.
 *
 * `node` is the default environment because most of the engine — the frame
 * path, options, the scale grammar, the pure deciders — needs no DOM, and a
 * node default makes an accidental `document` reach fail loudly instead of
 * passing against a fake. Files that need a DOM opt in with a
 * `// @vitest-environment happy-dom` docblock (jsdom is not an option: it has
 * no matchMedia, ResizeObserver or IntersectionObserver, so init() throws).
 */
export default defineConfig({
  // esbuild stamps this in real bundles; Vitest needs a value for the modules
  // that reference it (gate.ts, boot.ts). Plain identifier, so `define` works
  // here — unlike import.meta.env.DEV, see tests/setup.ts.
  define: {
    __ARTS_CURSOR_VERSION__: JSON.stringify('0.0.0-test')
  },
  resolve: {
    // Test-only alias — tests live in tests/ and reach the engine through it.
    // Never valid inside src/ts itself: consumers (Velum) compile that source
    // with their own config and would inherit the alias requirement. The
    // alias-boundary test enforces the split.
    alias: {
      '@ts': path.resolve(process.cwd(), 'src/ts')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Mirrors the shipped bundle by forcing import.meta.env.DEV false. A
    // `define` cannot do this job — see the file for why.
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
    // vi.stubGlobal is NOT reverted between tests by default, and the DOM tier
    // stubs IntersectionObserver/ResizeObserver/requestAnimationFrame.
    unstubGlobals: true,
    coverage: {
      // Istanbul rather than the default v8: fallow's `health --coverage` reads
      // Istanbul-format `coverage-final.json` only, and silently reports nothing
      // useful when handed v8/c8 native output. Instrumentation is slower than
      // v8's, which does not matter at this suite's size.
      provider: 'istanbul',
      // v4 removed `coverage.all` and reports only files loaded during the run
      // unless `include` says otherwise — without this, an untested module is
      // simply absent from the report rather than showing as uncovered.
      include: ['src/ts/**/*.ts'],
      // Spelled out rather than spread onto coverageConfigDefaults.exclude,
      // which is an empty array in v4 now that `include` does that job.
      exclude: ['src/ts/**/*.d.ts', 'src/ts/interfaces/**', 'src/ts/types/**', 'src/ts/index.ts'],
      // `json` is what writes coverage/coverage-final.json for fallow.
      reporter: ['text', 'html', 'json']
    }
  }
})
