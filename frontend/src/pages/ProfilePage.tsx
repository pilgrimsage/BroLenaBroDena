import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Bell, BellOff, ChevronRight,
  User, Check, Trash2
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useAuthStore } from '@/store/auth'
import { useNotifications } from '@/hooks/useApi'
import { Skeleton } from '@/components/Skeleton'
import api from '@/api/axios'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/theme'

dayjs.extend(relativeTime)

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [showNotifs, setShowNotifs] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const { data: notifData, isLoading: loadingNotifs, refetch } = useNotifications()
  const notifications = notifData?.notifications?.data ?? []
  const unreadCount   = notifData?.unread_count ?? 0

  const { isDark, toggle } = useThemeStore()

  // ── Logout ────────────────────────────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/auth')
  }

  // ── Mark all read ─────────────────────────────────────────────────
  async function markAllRead() {
    await api.post('/notifications/mark-all-read')
    refetch()
    // refetch() manually triggers the useQuery to refetch
    // useful when you want immediate update without waiting for staleTime
  }

  // ── Mark one read ─────────────────────────────────────────────────
  async function markOneRead(id: string) {
    await api.post(`/notifications/${id}/read`)
    refetch()
  }

  // ── Delete notification ───────────────────────────────────────────
  async function deleteNotif(id: string) {
    await api.delete(`/notifications/${id}`)
    refetch()
  }

  // ── Avatar initials ───────────────────────────────────────────────
  const initials = user?.name
    .split(' ')                           // ['Alice', 'Smith']
    .map(w => w.charAt(0).toUpperCase()) // ['A', 'S']
    .slice(0, 2)                          // max 2 letters
    .join('')                             // 'AS'
    ?? '?'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Profile header ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900
               border-gray-100 dark:border-white/5 bg-white px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-4">

          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-brand flex items-center
                          justify-center text-white font-bold text-xl flex-shrink-0">
            {initials}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white font-bold text-gray-900 text-lg leading-tight truncate">
              {user?.name ?? '…'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm text-gray-400 truncate mt-0.5">
              {user?.email}
            </p>
            {user?.phone && (
              <p className="text-xs text-gray-400 mt-0.5">{user.phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">

        {/* ── Notifications section ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Notifications header — tap to expand */}
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition"
          >
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500
                                 rounded-full text-[8px] text-white font-bold
                                 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="flex-1 text-left text-sm font-semibold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {unreadCount} unread
                </span>
              )}
            </span>
            <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform
              ${showNotifs ? 'rotate-90' : ''}`}
            />
          </button>

          {/* Expanded notification list */}
          {showNotifs && (
            <div className="border-t border-gray-100">

              {/* Mark all read button */}
              {unreadCount > 0 && (
                <div className="px-4 py-2 border-b border-gray-50 flex justify-end">
                  <button
                    onClick={markAllRead}
                    className="text-xs text-brand font-semibold hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              )}

              {/* Loading */}
              {loadingNotifs && (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              )}

              {/* Empty */}
              {!loadingNotifs && notifications.length === 0 && (
                <div className="text-center py-8">
                  <BellOff className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No notifications yet</p>
                </div>
              )}

              {/* Notification rows */}
              {notifications.map((notif: any) => (
                <NotificationRow
                  key={notif.id}
                  notif={notif}
                  onRead={() => markOneRead(notif.id)}
                  onDelete={() => deleteNotif(notif.id)}
                />
              ))}

            </div>
          )}
        </div>

        {/* ── Account section ───────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900
               border-gray-100 dark:border-white/5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Account
          </p>

          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-4 py-3.5
                      border-t border-gray-100 dark:border-white/5
                      hover:bg-gray-50 dark:hover:bg-white/5
                      active:bg-gray-100 transition-all text-left"
          >
            {isDark
              ? <Sun  className="w-4 h-4 text-amber-400 flex-shrink-0" />
              : <Moon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            }
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
            {/* Visual indicator */}
            <div className={`ml-auto w-10 h-6 rounded-full transition-colors
              ${isDark ? 'bg-brand' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform
                ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {/* User info row */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-3.5
                       border-t border-gray-50
                       hover:bg-red-50 active:bg-red-100
                       transition-all text-left disabled:opacity-60"
          >
            <LogOut className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-500">
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </div>

        {/* ── App info ──────────────────────────────────────────── */}
        <p className="text-center text-xs text-gray-300 pt-2">
          FriendLedger v1.0 · Built with Laravel + React
        </p>

      </div>
    </div>
  )
}

// ── Notification row sub-component ───────────────────────────────────

interface NotifRowProps {
  notif:    any
  onRead:   () => void
  onDelete: () => void
}

function NotificationRow({ notif, onRead, onDelete }: NotifRowProps) {
  const isUnread  = !notif.read_at
  const message   = notif.data?.message ?? 'New notification'
  const timeAgo   = dayjs(notif.created_at).fromNow()

  // Notification type → emoji
  const emoji: Record<string, string> = {
    friend_request: '👋',
    transaction:    '💸',
    settlement:     '✅',
    guest_joined:   '🎉',
  }
  const icon = emoji[notif.data?.type] ?? '🔔'

  return (
    <div className={`
      flex items-start gap-3 px-4 py-3.5 border-t border-gray-50
      transition-colors
      ${isUnread
      ? 'bg-blue-50/50 dark:bg-blue-500/5'
      : 'bg-white dark:bg-gray-900'}`}>

      {/* Icon */}
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug
          ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}
        `}>
          {message}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {isUnread && (
          <button
            onClick={onRead}
            title="Mark as read"
            className="p-1.5 rounded-lg hover:bg-blue-100 transition"
          >
            <Check className="w-3.5 h-3.5 text-blue-500" />
          </button>
        )}
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1.5 rounded-lg hover:bg-red-50 transition"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
        </button>
      </div>

    </div>
  )
}