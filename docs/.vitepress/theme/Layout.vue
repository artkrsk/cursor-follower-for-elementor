<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted } from 'vue'
import { createCursorApp } from '@engine'
import { rulesDemoScopes } from './rulesDemoScopes'

const { Layout } = DefaultTheme

// The docs boot the engine the way the WordPress plugin does — a discovery
// global in the IArtsCursorGlobal shape — so every example on these pages
// (and the reader's own console) speaks the documented contract. Not a reuse
// of boot.ts: that entry is WordPress-specific (options global and editor
// bridge). Layout.vue is the persistent SPA root,
// so this runs once per full page load and the engine survives client-side
// navigation.
let dispose: (() => void) | undefined
onUnmounted(() => dispose?.())
onMounted(() => {
  if (window.artsCursor?.get()) {
    return
  }
  // The rules-filter demo's scopes ride the one construction call —
  // targetScopes is not patchable later, and unmatched selectors no-op on
  // every other page.
  const app = createCursorApp({ options: { targetScopes: rulesDemoScopes } })
  dispose = () => app.destroy()
  app.init()
})
</script>

<template>
  <Layout />
</template>
