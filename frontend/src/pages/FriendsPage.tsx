import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Check, X, ChevronRight,
  Clock, Users, Loader2, Search, Phone
} from 'lucide-react'
import {
  useFriends,
  usePendingRequests,
  useSendFriendRequest,
  useRespondFriendRequest,
  useRemoveFriend,
} from '@/hooks/useApi'
import { Skeleton } from '@/components/Skeleton'

type Tab = 'friends' | 'pending' | 'add'

export default function FriendsPage() {
  const navigate = useNavigate()
  const [tab,    setTab]    = useState<Tab>('friends')
  const [phone,  setPhone]  = useState('')
  const [sendError,   setSendError]   = useState('')
  const [sendSuccess, setSendSuccess] = useState('')

  const { data: friends = [], isLoading: loadingFriends } = useFriends()
  const { data: pending = [], isLoading: loadingPending } = usePendingRequests()
  const sendRequest  = useSendFriendRequest()
  const respondReq   = useRespondFriendRequest()
  const removeFriend = useRemoveFriend()

  const pendingCount = (pending as any[]).length

  // ── Send friend request by phone ──────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSendError('')
    setSendSuccess('')

    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) {
      setSendError('Enter a valid 10-digit phone number.')
      return
    }

    try {
      await sendRequest.mutateAsync({ phone: cleaned })
      setSendSuccess('Friend request sent!')
      setPhone('')
    } catch (err: any) {
      if (err?.isOfflineQueued) {
        setSendSuccess('Request queued — will send when online.')
        setPhone('')
        return
      }
      const msg = err?.response?.data?.message
              ?? 'Failed to send request.'
      setSendError(String(msg))
    }
  }

  async function handleRespond(id: number, action: 'accept' | 'decline') {
    try {
      await respondReq.mutateAsync({ id, action })
    } catch {
      // silent
    }
  }

  async function handleRemove(userId: number, name: string) {
    if (!window.confirm(`Remove ${name} from friends?`)) return
    try {
      await removeFriend.mutateAsync(userId)
    } catch {
      alert('Failed to remove. Try again.')
    }
  }

  const input = `
    w-full px-4 py-3 rounded-xl text-sm
    bg-gray-50 dark:bg-white/5
    border border-gray-200 dark:border-white/10
    text-gray-900 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand
    transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500
  `

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Tab bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100
                      dark:border-white/5 px-5 pt-4 pb-0 sticky top-14 z-10">
        <div className="flex gap-1">
          {([
            { key: 'friends', label: 'Friends',  count: null         },
            { key: 'pending', label: 'Requests', count: pendingCount },
            { key: 'add',     label: 'Add',      count: null         },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold
                          border-b-2 transition-all
                          ${tab === key
                            ? 'border-brand text-brand'
                            : 'border-transparent text-gray-400 dark:text-gray-500'
                          }`}
            >
              {label}
              {count !== null && count > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold
                                 w-4 h-4 rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        {tab === 'friends' && (
          <FriendsTab
            friends={friends as any[]}
            isLoading={loadingFriends}
            onLedger={id => navigate(`/ledger/${id}`)}
            onRemove={handleRemove}
          />
        )}

        {tab === 'pending' && (
          <PendingTab
            pending={pending as any[]}
            isLoading={loadingPending}
            onAccept={id => handleRespond(id, 'accept')}
            onDecline={id => handleRespond(id, 'decline')}
            isResponding={respondReq.isPending}
          />
        )}

        {tab === 'add' && (
          <AddFriendTab
            phone={phone}
            onPhoneChange={setPhone}
            onSubmit={handleSend}
            isPending={sendRequest.isPending}
            error={sendError}
            success={sendSuccess}
            input={input}
          />
        )}
      </div>
    </div>
  )
}

// ── FriendsTab ───────────────────────────────────────────────────────

function FriendsTab({
  friends, isLoading, onLedger, onRemove,
}: {
  friends:   any[]
  isLoading: boolean
  onLedger:  (id: number) => void
  onRemove:  (id: number, name: string) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.phone ?? '').includes(search)
  )

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
    </div>
  )

  if (friends.length === 0) return (
    <div className="text-center py-16">
      <Users className="w-10 h-10 text-gray-200 dark:text-white/10 mx-auto mb-3" />
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No friends yet</p>
      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
        Go to Add tab to send a request
      </p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search friends…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                     bg-white dark:bg-gray-900
                     border border-gray-200 dark:border-white/10
                     text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
        />
      </div>

      {/* Cards */}
      {filtered.map(friend => (
        <div key={friend.id}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-4
                     border border-gray-100 dark:border-white/5 shadow-sm"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-brand/10 dark:bg-brand/20
                          flex items-center justify-center
                          font-bold text-brand text-sm flex-shrink-0">
            {friend.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {friend.name}
            </p>
            {/* Show phone if available, else email */}
            {(friend.phone || friend.email) && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {friend.phone || friend.email}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onLedger(friend.id)}
              className="flex items-center gap-1 text-xs font-semibold
                         text-brand bg-brand/10 dark:bg-brand/20
                         px-3 py-1.5 rounded-lg
                         hover:bg-brand/20 active:scale-95 transition-all"
            >
              Ledger <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => onRemove(friend.id, friend.name)}
              className="text-gray-300 dark:text-gray-600 hover:text-red-400
                         transition p-1.5 rounded-lg hover:bg-red-50
                         dark:hover:bg-red-500/10 active:scale-95"
              title="Remove friend"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {filtered.length === 0 && search && (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
          No friends matching "{search}"
        </p>
      )}
    </div>
  )
}

// ── PendingTab ───────────────────────────────────────────────────────

function PendingTab({
  pending, isLoading, onAccept, onDecline, isResponding,
}: {
  pending:      any[]
  isLoading:    boolean
  onAccept:     (id: number) => void
  onDecline:    (id: number) => void
  isResponding: boolean
}) {
  if (isLoading) return (
    <div className="space-y-3">
      {[1,2].map(i => <Skeleton key={i} className="h-20" />)}
    </div>
  )

  if (pending.length === 0) return (
    <div className="text-center py-16">
      <Clock className="w-10 h-10 text-gray-200 dark:text-white/10 mx-auto mb-3" />
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No pending requests</p>
      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">You're all caught up</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {pending.map(req => (
        <div key={req.id}
          className="bg-white dark:bg-gray-900 rounded-2xl p-4
                     border border-gray-100 dark:border-white/5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/10
                            flex items-center justify-center
                            font-bold text-amber-600 dark:text-amber-400 text-sm flex-shrink-0">
              {req.requester.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                {req.requester.name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {req.requester.phone || req.requester.email || ''}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAccept(req.id)}
              disabled={isResponding}
              className="flex-1 flex items-center justify-center gap-1.5
                         text-sm font-semibold text-white bg-brand
                         py-2.5 rounded-xl hover:bg-brand-dark
                         active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Accept
            </button>
            <button
              onClick={() => onDecline(req.id)}
              disabled={isResponding}
              className="flex-1 flex items-center justify-center gap-1.5
                         text-sm font-semibold text-gray-500 dark:text-gray-400
                         bg-gray-100 dark:bg-white/5
                         py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10
                         active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── AddFriendTab ─────────────────────────────────────────────────────

function AddFriendTab({
  phone, onPhoneChange, onSubmit,
  isPending, error, success, input,
}: {
  phone:         string
  onPhoneChange: (v: string) => void
  onSubmit:      (e: React.FormEvent) => void
  isPending:     boolean
  error:         string
  success:       string
  input:         string
}) {
  return (
    <div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5
                      border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-brand/10 dark:bg-brand/20
                          flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900 dark:text-white">
              Send a friend request
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Enter their phone number
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Phone input with +91 prefix */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2
                            flex items-center gap-2 pointer-events-none">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium
                               border-r border-gray-200 dark:border-white/10 pr-2">
                +91
              </span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={phone}
              onChange={e => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={input + ' pl-24'}
              maxLength={10}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 dark:text-rose-400
                          bg-rose-50 dark:bg-rose-500/10 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {success && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400
                          bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-4 py-2.5">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || phone.length < 10}
            className="w-full py-3 rounded-xl font-bold text-sm text-white
                       bg-brand hover:bg-brand-dark active:scale-[0.98]
                       transition-all disabled:opacity-60
                       flex items-center justify-center gap-2"
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <UserPlus className="w-4 h-4" />
            }
            {isPending ? 'Sending…' : 'Send request'}
          </button>
        </form>
      </div>

      <div className="mt-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4
                      border border-blue-100 dark:border-blue-500/20">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
          Friend not on BrolenaBrodena yet?
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
          You can still track transactions with them.
          From the Dashboard tap + → Guest tab.
          When they join with the same number, everything links automatically.
        </p>
      </div>
    </div>
  )
}