import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/axios'

// Define the shape of our auth store with TypeScript
interface User {
  id: number
  name: string
  email: string
  phone?: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: Record<string, string>) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthStore>()(
  // persist = automatically save to localStorage
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        localStorage.setItem('auth_token', data.token)
        set({ user: data.user, token: data.token, isLoggedIn: true })
      },

      register: async (formData) => {
        const { data } = await api.post('/auth/register', formData)
        localStorage.setItem('auth_token', data.token)
        set({ user: data.user, token: data.token, isLoggedIn: true })
      },

      fetchMe: async () => {
        const { data } = await api.get('/auth/me')
        set({ user: data, isLoggedIn: true })
      },

      logout: async () => {
        await api.post('/auth/logout').catch(() => {})
        localStorage.removeItem('auth_token')
        set({ user: null, token: null, isLoggedIn: false })
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist token — re-fetch user on load
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
)