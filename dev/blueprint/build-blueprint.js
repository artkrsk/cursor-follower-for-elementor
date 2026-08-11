#!/usr/bin/env node
/**
 * Generates .wordpress-org/blueprints/blueprint.json — the wp.org Live Preview blueprint.
 *
 * Self-contained by design: the seed script is inlined as a writeFile step rather than
 * fetched. wp.org's SVN serves no CORS headers so a blueprint cannot pull its own assets
 * back down, and a GitHub-raw dependency would put the live preview at the mercy of a repo
 * URL plus a tag bump every release. The six posters and the Site Settings screenshot are
 * embedded inside the seed itself for the same reason.
 *
 * The release workflow copies .wordpress-org/ into SVN assets/ wholesale, so the
 * blueprints/ subdir needs no build wiring of its own — run `pnpm blueprint:build`
 * after editing dev/seed/demo-page.php and commit the regenerated blueprint.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(
  new URL('../../.wordpress-org/blueprints/blueprint.json', import.meta.url)
)
const seed = readFileSync(new URL('../seed/demo-page.php', import.meta.url), 'utf8')

// Single source of truth for the page id: the landingPage and the seeder cannot drift.
const pageId = seed.match(/define\(\s*'ARTS_CF_DEMO_PAGE_ID',\s*(\d+)\s*\)/)?.[1]

if (!pageId) {
  console.error('blueprint:build: could not read ARTS_CF_DEMO_PAGE_ID out of dev/seed/demo-page.php')
  process.exit(1)
}

// `wp eval-file` silently declines to execute a PHP file containing a very long line,
// and the seed carries two large embedded blobs. They are emitted wrapped; guard it
// here so a future minified regeneration fails the build instead of the seeder.
const longest = seed.split('\n').reduce((max, line) => Math.max(max, line.length), 0)

if (longest > 4000) {
  console.error(`blueprint:build: dev/seed/demo-page.php has a ${longest}-char line.`)
  console.error('Long lines stop `wp eval-file` from running the seed. Wrap the blobs.')
  process.exit(1)
}

const blueprint = {
  $schema: 'https://playground.wordpress.net/blueprint-schema.json',
  // The front end, not the editor: this plugin is judged by how the cursor feels, and
  // inside the editor it exists only within the preview iframe. `?page_id=` rather than
  // a pretty permalink so it resolves without depending on rewrite rules being flushed.
  landingPage: `/?page_id=${pageId}`,
  preferredVersions: { php: '8.1', wp: 'latest' },
  // Required: without it the wordpress.org plugin/theme installs fail on CORS.
  features: { networking: true },
  login: true,
  steps: [
    {
      step: 'installPlugin',
      pluginData: { resource: 'wordpress.org/plugins', slug: 'elementor' },
      options: { activate: true }
    },
    {
      step: 'installTheme',
      themeData: { resource: 'wordpress.org/themes', slug: 'hello-elementor' },
      options: { activate: true }
    },
    { step: 'writeFile', path: '/wordpress/wp-content/arts-cf-demo-seed.php', data: seed },
    {
      step: 'runPHP',
      code: "<?php require_once '/wordpress/wp-load.php'; require '/wordpress/wp-content/arts-cf-demo-seed.php';"
    }
  ]
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(blueprint, null, 2)}\n`)

console.log(
  `blueprint:build OK — ${OUT} (${(JSON.stringify(blueprint).length / 1024).toFixed(1)} KB, page id ${pageId})`
)
