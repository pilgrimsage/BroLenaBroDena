import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Check, X, ChevronRight,
  Clock, Users, Loader2, Search
} from 'lucide-react'
import {
  useFriends,
  usePendingRequests,
  useSendFriendRequest,
  useRespondFriendRequest,
  useRemoveFriend,
} from '@/hooks/useApi'
import { Skeleton } from '@/components/Skeleton'

// Tab type — keeps TypeScript happy
type Tab = 'friends' | 'pending' | 'add'

export default function FriendsPage() {
  const navigate          = useNavigate()
  const [tab, setTab]     = useState<Tab>('friends')
  const [email, setEmail] = useState('')
  const [sendError, setSendError]     = useState('')
  const [sendSuccess, setSendSuccess] = useState('')

  // ── Data hooks ────────────────────────────────────────────────────
  const { data: friends = [],  isLoading: loadingFriends  } = useFriends()
  const { data: pending = [],  isLoading: loadingPending  } = usePendingRequests()
  const sendRequest  = useSendFriendRequest()
  const respondReq   = useRespondFriendRequest()
  const removeFriend = useRemoveFriend()

  // Pending count for badge on tab
  const pendingCount = pending.length

  // ── Send friend request ───────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSendError('')
    setSendSuccess('')

    if (!email.trim()) {
      setSendError('Enter an email address.')
      return
    }

    try {
      await sendRequest.mutateAsync(email.trim())
      setSendSuccess(`Request sent to ${email}!`)
      setEmail('')
    } catch (err: any) {
      const msg = err?.response?.data?.message
              ?? err?.response?.data?.errors?.email?.[0]
              ?? 'Failed to send request.'
      setSendError(String(msg))
    }
  }

  // ── Respond to request ────────────────────────────────────────────
  async function handleRespond(id: number, action: 'accept' | 'decline') {
    try {
      await respondReq.mutateAsync({ id, action })
      // Cache auto-updates — pending list refreshes, friends list refreshes
    } catch {
      // Silent — UI reflects actual state after refetch
    }
  }

  // ── Remove friend ─────────────────────────────────────────────────
  async function handleRemove(userId: number, name: string) {
    // Simple confirmation — no need for modal yet
    const confirmed = window.confirm(`Remove ${name} from friends?`)
    if (!confirmed) return

    try {
      await removeFriend.mutateAsync(userId)
    } catch {
      alert('Failed to remove. Try again.')
    }
  }

  // ── Shared input style ────────────────────────────────────────────
  const input = `
    w-full px-4 py-3 rounded-xl text-sm bg-gray-50
    border border-gray-200 focus:outline-none
    focus:ring-2 focus:ring-brand/40 focus:border-brand
    transition-all placeholder:text-gray-400
  `

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-5 pt-4 pb-0 sticky top-14 z-10">
        <div className="flex gap-1">
          {([
            { key: 'friends', label: 'Friends',  count: null         },
            { key: 'pending', label: 'Requests', count: pendingCount },
            { key: 'add',     label: 'Add',      count: null         },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`
                relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold
                border-b-2 transition-all
                ${tab === key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }
              `}
            >
              {label}
              {/* Badge — only show if count > 0 */}
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

        {/* ── Tab: Friends list ─────────────────────────────────── */}
        {tab === 'friends' && (
          <FriendsTab
            friends={friends}
            isLoading={loadingFriends}
            onChat={(id) => navigate(`/ledger/${id}`)}
            onRemove={handleRemove}
          />
        )}

        {/* ── Tab: Pending requests ─────────────────────────────── */}
        {tab === 'pending' && (
          <PendingTab
            pending={pending}
            isLoading={loadingPending}
            onAccept={(id) => handleRespond(id, 'accept')}
            onDecline={(id) => handleRespond(id, 'decline')}
            isResponding={respondReq.isPending}
          />
        )}

        {/* ── Tab: Add friend ───────────────────────────────────── */}
        {tab === 'add' && (
          <AddFriendTab
            email={email}
            onEmailChange={setEmail}
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

// ── Sub-component: Friends list ──────────────────────────────────────

interface FriendsTabProps {
  friends:   any[]
  isLoading: boolean
  onChat:    (id: number) => void
  onRemove:  (id: number, name: string) => void
}

function FriendsTab({ friends, isLoading, onChat, onRemove }: FriendsTabProps) {
  const [search, setSearch] = useState('')

  // Client-side filter — no API call needed for simple search
  const filtered = friends.filter((f: any) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
    </div>
  )

  if (friends.length === 0) return (
    <div className="text-center py-16">
      <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 text-sm font-medium">No friends yet</p>
      <p className="text-gray-300 text-xs mt-1">
        Go to Add tab to send a request
      </p>
    </div>
  )

  return (
    <div className="space-y-3">

      {/* Search box — client side */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search friends…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white
                     border border-gray-200 focus:outline-none
                     focus:ring-2 focus:ring-brand/40 transition-all"
        />
      </div>

      {/* Friend cards */}
      {filtered.map((friend: any) => (
        <div
          key={friend.id}
          className="flex items-center gap-3 bg-white rounded-2xl p-4
                     border border-gray-100 shadow-sm"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center
                          justify-center font-bold text-brand text-sm flex-shrink-0">
            {friend.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">
              {friend.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{friend.email}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            {/* View ledger */}
            <button
              onClick={() => onChat(friend.id)}
              className="flex items-center gap-1 text-xs font-semibold
                         text-brand bg-brand/10 px-3 py-1.5 rounded-lg
                         hover:bg-brand/20 active:scale-95 transition-all"
            >
              Ledger <ChevronRight className="w-3 h-3" />
            </button>

            {/* Remove */}
            <button
              onClick={() => onRemove(friend.id, friend.name)}
              className="text-gray-300 hover:text-red-400 transition p-1.5 rounded-lg
                         hover:bg-red-50 active:scale-95"
              title="Remove friend"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* No search results */}
      {filtered.length === 0 && search && (
        <p className="text-center text-gray-400 text-sm py-8">
          No friends named "{search}"
        </p>
      )}

    </div>
  )
}

// ── Sub-component: Pending requests ──────────────────────────────────

interface PendingTabProps {
  pending:      any[]
  isLoading:    boolean
  onAccept:     (id: number) => void
  onDecline:    (id: number) => void
  isResponding: boolean
}

function PendingTab({ pending, isLoading, onAccept, onDecline, isResponding }: PendingTabProps) {

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2].map(i => <Skeleton key={i} className="h-20" />)}
    </div>
  )

  if (pending.length === 0) return (
    <div className="text-center py-16">
      <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 text-sm font-medium">No pending requests</p>
      <p className="text-gray-300 text-xs mt-1">
        You're all caught up
      </p>
    </div>
  )

  return (
    <div className="space-y-3">
      {pending.map((req: any) => (
        <div
          key={req.id}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3">

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center
                            justify-center font-bold text-amber-600 text-sm flex-shrink-0">
              {req.requester.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">
                {req.requester.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {req.requester.email}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAccept(req.id)}
              disabled={isResponding}
              className="flex-1 flex items-center justify-center gap-1.5
                         text-sm font-semibold text-white bg-brand
                         py-2.5 rounded-xl hover:bg-brand/90
                         active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={() => onDecline(req.id)}
              disabled={isResponding}
              className="flex-1 flex items-center justify-center gap-1.5
                         text-sm font-semibold text-gray-500 bg-gray-100
                         py-2.5 rounded-xl hover:bg-gray-200
                         active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Sub-component: Add friend ─────────────────────────────────────────

interface AddFriendTabProps {
  email:         string
  onEmailChange: (v: string) => void
  onSubmit:      (e: React.FormEvent) => void
  isPending:     boolean
  error:         string
  success:       string
  input:         string
}

function AddFriendTab({
  email, onEmailChange, onSubmit,
  isPending, error, success, input,
}: AddFriendTabProps) {
  return (
    <div>
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">Send a request</p>
            <p className="text-xs text-gray-400">Enter their FriendLedger email</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            className={input}
            autoFocus
          />

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2.5">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl font-bold text-sm text-white
                       bg-brand hover:bg-brand/90 active:scale-[0.98]
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

      {/* Info card */}
      <div className="mt-4 bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <p className="text-xs font-semibold text-blue-700 mb-1">
          Friend not on FriendLedger?
        </p>
        <p className="text-xs text-blue-600 leading-relaxed">
          You can still add transactions with them.
          From the Dashboard, tap + and choose "Not on app yet".
          When they join, everything links automatically.
        </p>
      </div>
    </div>
  )
}