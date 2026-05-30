import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/axios'

// Define the shape of our auth store with TypeScript
interface User {
  id:     number
  name:   string
  phone:  string
  email?: string
}

interface AuthStore {
  user:       User | null
  token:      string | null
  isLoggedIn: boolean
  fetchMe:    () => Promise<void>
  logout:     () => Promise<void>
  setUser:    (user: User) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user:       null,
      token:      null,
      isLoggedIn: false,

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
      name: 'auth-storage',
      partialize: s => ({ token: s.token, isLoggedIn: s.isLoggedIn }),
    }
  )
)