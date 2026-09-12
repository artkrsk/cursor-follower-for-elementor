<script setup lang="ts">
import type { ICursorFollower } from '@engine'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import html from '../../../demos/element-attachments.html?raw'
import { installElementExamples } from '../../../demos/element-attachments'

const root = ref<HTMLElement>()
let cleanup: (() => void) | undefined
let lifecycle: AbortController | undefined
onMounted(() => {
  lifecycle = new AbortController()
  const connect = (cursor: ICursorFollower) => {
    if (cleanup || !root.value || lifecycle?.signal.aborted) return
    cleanup = installElementExamples(root.value, cursor)
  }
  document.addEventListener('arts-cursor:ready', (event) => {
    connect((event as CustomEvent<ICursorFollower>).detail)
  }, { signal: lifecycle.signal })
  const cursor = window.artsCursor?.get()
  if (cursor) connect(cursor)
})
onBeforeUnmount(() => { lifecycle?.abort(); cleanup?.() })
</script>

<template><div ref="root" class="element-attachment-demos" v-html="html" /></template>
