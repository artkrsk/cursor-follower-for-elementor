<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import { createCursor } from '@engine'
import type { ICursorFollower } from '@engine'
import { rulesDemoScopes } from './rulesDemoScopes'

const { Layout } = DefaultTheme

// The docs boot the engine the way the WordPress plugin does — a discovery
// global in the IArtsCursorGlobal shape — so every example on these pages
// (and the reader's own console) speaks the documented contract. Not a reuse
// of boot.ts: that entry is WordPress-specific (options global, editor
// bridge, esbuild-injected version). Layout.vue is the persistent SPA root,
// so this runs once per full page load and the engine survives client-side
// navigation.
onMounted(() => {
  if (window.artsCursor) {
    return
  }
  let instance: ICursorFollower | null = null
  let resolveReady!: (cursor: ICursorFollower) => void
  const ready = new Promise<ICursorFollower>((resolve) => {
    resolveReady = resolve
  })
  window.artsCursor = { ready, get: () => instance, version: 'docs' }
  // The rules-filter demo's scopes ride the one construction call —
  // targetScopes is not patchable later, and unmatched selectors no-op on
  // every other page.
  instance = createCursor({ targetScopes: rulesDemoScopes })
  instance.init()
  resolveReady(instance)
})
</script>

<template>
  <Layout />
</template>
