import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  isDark:     boolean
  toggle:     () => void
  setDark:    (v: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: false,

      toggle: () => set((state) => {
        const next = !state.isDark
        applyTheme(next)
        return { isDark: next }
      }),

      setDark: (v) => {
        applyTheme(v)
        set({ isDark: v })
      },
    }),
    { name: 'theme' }
    // persists to localStorage automatically
  )
)

// Applies or removes 'dark' class on <html>
function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}