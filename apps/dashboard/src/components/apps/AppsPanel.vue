<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../../lib/auth'
import AppList from './AppList.vue'
import NetworkList from './networks/NetworkList.vue'
import VolumeList from './volumes/VolumeList.vue'

const { isAdmin } = useAuth()

type SectionId = 'containers' | 'networks' | 'volumes'

interface NavItem { id: SectionId; label: string }

const nav: NavItem[] = [
  { id: 'containers', label: 'Containers' },
  { id: 'networks',   label: 'Networks' },
  { id: 'volumes',    label: 'Volumes' },
]

const active = ref<SectionId>('containers')

const appListRef = ref<InstanceType<typeof AppList> | null>(null)

function openNew() {
  appListRef.value?.openNew()
}

defineExpose({ openNew, active })
</script>

<template>
  <div v-if="!isAdmin" class="flex items-center justify-center w-full h-full text-[var(--c-text-3)] text-sm">
    Administrator access required.
  </div>

  <div v-else class="flex flex-col sm:flex-row h-full w-full">

    <!-- Mobile picker -->
    <div class="sm:hidden flex-shrink-0 border-b border-[var(--c-border)] bg-[var(--c-sidebar)] px-4 py-2.5">
      <select v-model="active" class="w-full bg-transparent text-sm text-[var(--c-text-2)] focus:outline-none">
        <option v-for="item in nav" :key="item.id" :value="item.id">{{ item.label }}</option>
      </select>
    </div>

    <!-- Left nav -->
    <nav class="hidden sm:flex w-40 flex-shrink-0 border-r border-[var(--c-border)] bg-[var(--c-sidebar)] py-5 px-2 flex-col gap-0.5 overflow-y-auto">
      <div v-for="item in nav" :key="item.id" class="relative flex items-center">
        <span
          v-if="active === item.id"
          class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--c-accent)] rounded-r-full"
        />
        <button
          @click="active = item.id"
          :class="[
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
            active === item.id
              ? 'bg-[var(--c-accent-subtle)] text-[var(--c-accent)]'
              : 'text-[var(--c-text-3)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text-1)]',
          ]"
        >
          <!-- Containers -->
          <svg v-if="item.id === 'containers'" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
          </svg>
          <!-- Networks -->
          <svg v-else-if="item.id === 'networks'" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856a10 10 0 0113.788 0M1.924 8.674a14.75 14.75 0 0120.152 0M12 20.25h.008v.008H12v-.008z"/>
          </svg>
          <!-- Volumes -->
          <svg v-else-if="item.id === 'volumes'" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"/>
          </svg>
          {{ item.label }}
        </button>
      </div>
    </nav>

    <!-- Content -->
    <AppList v-if="active === 'containers'" ref="appListRef" class="h-full flex-1 min-w-0" />
    <div v-else-if="active === 'networks'" class="flex-1 min-w-0 overflow-y-auto">
      <NetworkList />
    </div>
    <div v-else-if="active === 'volumes'" class="flex-1 min-w-0 overflow-y-auto">
      <VolumeList />
    </div>

  </div>
</template>
