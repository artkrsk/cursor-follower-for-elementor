import path from 'node:path'
import { defineConfig } from 'vitepress'

// Docs site for the plugin. `base` comes from CI (DOCS_BASE_PATH must match
// the GitHub repo name exactly — it is only ever exercised in the Pages
// build); local dev/build serve from '/'. The aliases mirror what the engine
// source expects: the docs are a first-class Vite consumer of `src/ts` and
// `src/styles`, same as the WordPress bundle.
export default defineConfig({
  title: 'Arts Cursor Follower for Elementor',
  description:
    'An animated cursor follower for Elementor: magnetic buttons, link highlights, text and icon hints, drag effects. Loads nothing on touch devices.',
  base: process.env.DOCS_BASE_PATH || '/',
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#111111' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide' },
      { text: 'Effects', link: '/effects' },
      { text: 'Developers', link: '/developers' }
    ],
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/artkrsk/cursor-follower-for-elementor' }
    ],
    editLink: {
      pattern: 'https://github.com/artkrsk/cursor-follower-for-elementor/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: 'Released under the GPL-3.0 License',
      copyright: 'Copyright © 2026 Artem Semkin'
    }
  },
  vite: {
    resolve: {
      alias: {
        '@engine': path.resolve(process.cwd(), 'src/ts/index.ts'),
        '@styles': path.resolve(process.cwd(), 'src/styles')
      }
    },
    server: {
      watch: {
        // dist/cache live inside the source root; without this, every
        // `docs:build` force-reloads any open docs:dev tab.
        ignored: ['**/docs/.vitepress/dist/**', '**/docs/.vitepress/cache/**']
      }
    }
  }
})
