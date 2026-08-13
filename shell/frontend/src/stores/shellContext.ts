import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function darkMediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : null
}

// Ambient shell state that extensions receive as context attributes
// (STD 001 CONSUMPTION-17, STD 002 EXT-23). The shell is the source of truth;
// extensions only ever read it, and only off their own host element.
export const useShellContextStore = defineStore('shellContext', () => {
  const preference = ref<ThemePreference>('system')
  const systemDark = ref(darkMediaQuery()?.matches ?? false)
  const locale = ref(
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en',
  )

  // Extensions receive a resolved value: the contract says shell-theme is
  // 'light' or 'dark', so the 'system' preference never reaches an extension.
  const theme = computed<ResolvedTheme>(() =>
    preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value,
  )

  // Returns a teardown function; the root component owns the subscription.
  function watchSystemTheme(): () => void {
    const query = darkMediaQuery()
    if (!query) {
      return () => {}
    }
    const onChange = (event: MediaQueryListEvent) => {
      systemDark.value = event.matches
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }

  return { preference, locale, theme, watchSystemTheme }
})
