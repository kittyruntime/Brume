import { ref } from 'vue'

// Per-browser, not per-account (same reasoning as desktop mode in ./desktop.ts):
// whether you want to see raw UIDs/paths/etc. is a "how I like to look at this
// machine" setting, not part of the account's identity.
const STORAGE_KEY = 'advancedMode'

function load(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

function save(v: boolean) {
  localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
}

const advancedMode = ref<boolean>(load())

export function useAdvancedMode() {
  function setAdvancedMode(v: boolean) {
    advancedMode.value = v
    save(v)
  }

  return { advancedMode, setAdvancedMode }
}
