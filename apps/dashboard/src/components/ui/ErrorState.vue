<script setup lang="ts">
defineProps<{ message: string; compact?: boolean; retryLabel?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div role="alert" :class="['flex flex-col items-center text-center', compact ? 'gap-2 py-4' : 'gap-3 py-12']">
    <span class="grid h-9 w-9 place-items-center rounded-full bg-danger/10 text-danger" aria-hidden="true">!</span>
    <p class="max-w-md break-words text-sm text-danger">{{ message }}</p>
    <button v-if="retryLabel" class="btn btn-outline btn-sm" @click="$emit('retry')">{{ retryLabel }}</button>
  </div>
</template>
