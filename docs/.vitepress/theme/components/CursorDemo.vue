<script setup lang="ts">
// The stage renders the snippet file's markup verbatim (v-html): the engine's
// delegated handlers match late-mounted DOM like anything else, so a plain
// payload demo needs no JS at all. The touch note is CSS-only, keyed off the
// documented no-cursor-follower class — no watcher, no mount-timing race.
defineProps<{ html: string }>()
</script>

<template>
  <div class="cursor-demo">
    <div class="cursor-demo__stage" v-html="html" />
    <p class="cursor-demo__note">
      These demos need a mouse or trackpad — cursor effects stay off on touch devices.
    </p>
  </div>
</template>

<style>
.cursor-demo {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.cursor-demo__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 56px 24px;
}

.cursor-demo__note {
  display: none;
  margin: 0;
  padding: 8px 16px;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 13px;
}

html.no-cursor-follower .cursor-demo__note {
  display: block;
}
</style>
