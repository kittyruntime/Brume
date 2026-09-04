<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { trpc } from '../../lib/trpc'
import LoadingState from '../ui/LoadingState.vue'
import ErrorState from '../ui/ErrorState.vue'

type Alert = { id: string; source: string; target: string; message: string; lastSeenAt: string | Date }
type Thresholds = { diskUsageWarningPercent: number; diskUsageCriticalPercent: number }

const loading = ref(true)
const error   = ref('')
const alerts  = ref<Alert[]>([])
const thresholds = ref<Thresholds>({ diskUsageWarningPercent: 80, diskUsageCriticalPercent: 90 })

const form = ref<Thresholds>({ ...thresholds.value })
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

const isCritical = (a: Alert) => /critical/i.test(a.message) || a.source === 'storage.raid'

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [a, t] = await Promise.all([
      trpc.alert.list.query(),
      trpc.alert.thresholds.query(),
    ])
    alerts.value = (a as Alert[]).filter(x => x.source.startsWith('storage.'))
    thresholds.value = t
    form.value = { ...t }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load alerts'
  } finally {
    loading.value = false
  }
}

async function saveThresholds() {
  saveError.value = ''
  saved.value = false
  if (form.value.diskUsageCriticalPercent <= form.value.diskUsageWarningPercent) {
    saveError.value = 'Critical must be higher than warning'
    return
  }
  saving.value = true
  try {
    thresholds.value = await trpc.alert.updateThresholds.mutate(form.value)
    saved.value = true
  } catch (e: any) {
    saveError.value = e?.message ?? 'Failed to save thresholds'
  } finally {
    saving.value = false
  }
}

const dirty = computed(() =>
  form.value.diskUsageWarningPercent !== thresholds.value.diskUsageWarningPercent ||
  form.value.diskUsageCriticalPercent !== thresholds.value.diskUsageCriticalPercent
)

function fmtDate(v: string | Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(v))
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-[var(--c-text-1)] mb-1">Alerts</h2>
    <p class="text-sm text-[var(--c-text-3)] mb-6">
      RAID, S.M.A.R.T. and disk-usage checks, sampled every 5 minutes.
    </p>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" retry-label="Retry" @retry="load" />

    <div v-else class="space-y-6">
      <!-- Active alerts -->
      <div class="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] overflow-hidden">
        <div class="px-4 py-3 border-b border-[var(--c-border)]">
          <span class="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text-3)]">
            Active ({{ alerts.length }})
          </span>
        </div>
        <div v-if="!alerts.length" class="px-4 py-6 text-sm text-[var(--c-text-3)] text-center">
          No storage alerts right now.
        </div>
        <div v-else class="divide-y divide-[var(--c-border)]">
          <div v-for="a in alerts" :key="a.id" class="px-4 py-3 flex items-start gap-3">
            <span
              class="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
              :class="isCritical(a) ? 'bg-[var(--c-danger)]' : 'bg-[var(--c-warning)]'"
            />
            <div class="min-w-0 flex-1">
              <div class="text-sm text-[var(--c-text-1)] font-mono truncate">{{ a.target }}</div>
              <div class="text-xs text-[var(--c-text-3)] mt-0.5">{{ a.message }}</div>
            </div>
            <div class="text-[11px] text-[var(--c-text-3)] shrink-0 tabular-nums">{{ fmtDate(a.lastSeenAt) }}</div>
          </div>
        </div>
      </div>

      <!-- Disk-usage thresholds -->
      <div class="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] overflow-hidden">
        <div class="px-4 py-3 border-b border-[var(--c-border)]">
          <span class="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text-3)]">
            Disk-usage thresholds
          </span>
        </div>
        <div class="px-4 py-4 space-y-4">
          <p class="text-xs text-[var(--c-text-3)]">
            Each Place's filesystem is checked against these percentages. Doesn't apply to the
            RAID or S.M.A.R.T. checks, which alert on their own pass/fail state.
          </p>
          <div class="flex flex-wrap gap-6">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs text-[var(--c-text-3)]">Warning at</span>
              <div class="flex items-center gap-1.5">
                <input
                  v-model.number="form.diskUsageWarningPercent"
                  type="number" min="1" max="99"
                  class="w-16 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-deep)] px-2 py-1.5 text-sm text-[var(--c-text-1)] tabular-nums"
                >
                <span class="text-sm text-[var(--c-text-3)]">%</span>
              </div>
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs text-[var(--c-text-3)]">Critical at</span>
              <div class="flex items-center gap-1.5">
                <input
                  v-model.number="form.diskUsageCriticalPercent"
                  type="number" min="1" max="99"
                  class="w-16 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-deep)] px-2 py-1.5 text-sm text-[var(--c-text-1)] tabular-nums"
                >
                <span class="text-sm text-[var(--c-text-3)]">%</span>
              </div>
            </label>
          </div>
          <p v-if="saveError" class="text-xs text-[var(--c-danger)]">{{ saveError }}</p>
          <p v-else-if="saved && !dirty" class="text-xs text-[var(--c-success)]">Saved.</p>
          <button
            class="btn btn-sm btn-primary"
            :disabled="!dirty || saving"
            @click="saveThresholds"
          >{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
