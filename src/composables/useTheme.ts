import { ref, computed, watch, onMounted } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_KEY = 'easytier_theme'

const theme = ref<ThemePreference>((localStorage.getItem(THEME_KEY) as ThemePreference) || 'light')
const systemDark = ref(false)

export function useTheme() {
  const updateSystemDark = () => {
    systemDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const isDark = computed(() => {
    if (theme.value === 'system') {
      return systemDark.value
    }
    return theme.value === 'dark'
  })

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const setTheme = (newTheme: ThemePreference) => {
    theme.value = newTheme
    localStorage.setItem(THEME_KEY, newTheme)
    applyTheme()
  }

  const toggleTheme = () => {
    if (isDark.value) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  onMounted(() => {
    updateSystemDark()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      systemDark.value = e.matches
      if (theme.value === 'system') {
        applyTheme()
      }
    })
    applyTheme()
  })

  watch(isDark, applyTheme, { immediate: true })

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  }
}
