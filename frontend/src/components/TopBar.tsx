import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useNotifications } from '@/hooks/useApi'

export default function TopBar() {
  const user = useAuthStore(s => s.user)
  const { data: notifData } = useNotifications()

  const unreadCount = notifData?.unread_count ?? 0

  return (
    <header className="fixed top-0 inset-x-0 max-w-md mx-auto z-40
                       bg-white/90 backdrop-blur-md border-b border-gray-100
                       h-14 flex items-center justify-between px-5">

      {/* App name / greeting */}
      <div>
        <p className="text-xs text-gray-400">Welcome back</p>
        <p className="font-bold text-sm text-gray-900 leading-tight">
          {user?.name ?? '...'}
        </p>
      </div>

      {/* Notification bell */}
      <Link to="/profile" className="relative p-2 rounded-full hover:bg-gray-100 transition">
        <Bell className="w-5 h-5 text-gray-600" />

        {/* Red dot — only show if there are unread notifications */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </Link>

    </header>
  )
}