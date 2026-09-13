<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted } from 'vue'
import { createCursorWithLifecycle } from '../../../src/ts/core/createCursor'
import { getCursorGlobal } from '../../../src/ts/core/cursorGlobal'
import { rulesDemoScopes } from './rulesDemoScopes'

const { Layout } = DefaultTheme

// The docs boot the engine the way the WordPress plugin does — a discovery
// global in the IArtsCursorGlobal shape — so every example on these pages
// (and the reader's own console) speaks the documented contract. Not a reuse
// of boot.ts: that entry is WordPress-specific (options global, editor
// bridge, esbuild-injected version). Layout.vue is the persistent SPA root,
// so this runs once per full page load and the engine survives client-side
// navigation.
let dispose: (() => void) | undefined
onUnmounted(() => dispose?.())
onMounted(() => {
  if (window.artsCursor?.get()) {
    return
  }
  const hub = getCursorGlobal(window)
  // The rules-filter demo's scopes ride the one construction call —
  // targetScopes is not patchable later, and unmatched selectors no-op on
  // every other page.
  const instance = createCursorWithLifecycle({ targetScopes: rulesDemoScopes }, {
    initialized: (cursor) => hub.__publish(cursor),
    destroying: (cursor) => { if (hub.get() === cursor) hub.__publish(null) }
  })
  dispose = () => instance.destroy()
  instance.init()
})
</script>

<template>
  <Layout />
</template>
