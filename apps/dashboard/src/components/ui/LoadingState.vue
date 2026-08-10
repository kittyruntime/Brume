<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'
withDefaults(defineProps<{ label?: string; compact?: boolean }>(), { label: 'Loading…', compact: false })
</script>

<template>
  <div role="status" aria-live="polite" :class="['flex items-center justify-center text-[var(--c-text-3)]', compact ? 'gap-2 py-4 text-xs' : 'gap-2.5 py-12 text-sm']">
    <LoadingSpinner label="" />
    <span>{{ label }}</span>
  </div>
</template>
