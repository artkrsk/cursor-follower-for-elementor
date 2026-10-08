import { execFileSync } from 'node:child_process'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { compile } from 'sass'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = new URL('../dist/', import.meta.url)
await rm(new URL('esm/', output), { recursive: true, force: true })
await rm(new URL('types/', output), { recursive: true, force: true })
await mkdir(new URL('esm/', output), { recursive: true })
await build({
  absWorkingDir: root,
  entryPoints: { index: 'src/ts/index.ts', contract: 'src/ts/contract.ts', gate: 'src/ts/gateEntry.ts' },
  outdir: 'dist/esm',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  define: { 'import.meta.env.DEV': 'false' }
})
execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.library.json'], { cwd: root, stdio: 'inherit' })
await cp(new URL('../src/ts/env.d.ts', import.meta.url), new URL('types/src/ts/env.d.ts', output))
const css = compile(fileURLToPath(new URL('../src/styles/index.scss', import.meta.url)), {
  style: 'compressed'
}).css
await writeFile(new URL('esm/styles.css', output), css)
