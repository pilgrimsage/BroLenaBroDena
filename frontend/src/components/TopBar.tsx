import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useNotifications } from '@/hooks/useApi'
import { useSync } from '@/hooks/useSync'

export default function TopBar() {
  const user          = useAuthStore(s => s.user)
  const { data }      = useNotifications()
  const { isOnline }  = useSync()

  const unreadCount = data?.unread_count ?? 0

  return (
    <header className={`
      fixed inset-x-0 max-w-md mx-auto z-40 h-14 safe-top
      bg-white/90 dark:bg-gray-900/90 backdrop-blur-md
      border-b border-gray-100 dark:border-white/5
      flex items-center justify-between px-5
      ${isOnline ? 'top-0' : 'top-[38px]'}
    `}>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Welcome back</p>
        <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
          {user?.name ?? '…'}
        </p>
      </div>

      <Link
        to="/profile"
        className="relative p-2 rounded-full
                   hover:bg-gray-100 dark:hover:bg-white/10 transition"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </Link>
    </header>
  )
}