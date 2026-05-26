import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { useBalances } from '@/hooks/useApi'
import { FriendCardSkeleton } from '@/components/Skeleton'
import AddTransaction from '@/components/AddTransaction'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)

  // One line — data, loading state, error all handled
  const { data, isLoading, error } = useBalances()
  // data = { net, total_owed_to_me, total_i_owe, friends: [...] }
  // isLoading = true while fetching
  // error = Error object if request failed

  const net     = data?.net           ?? 0
  const owedMe  = data?.total_owed_to_me ?? 0
  const iOwe    = data?.total_i_owe      ?? 0
  const friends = data?.friends          ?? []
  // ?? 0 — if data is undefined (loading), default to 0

  return (
    <div className="px-5 pt-4 pb-6 space-y-5">

      {/* ── Net balance card ─────────────────────────────────────── */}
      <div className={`
        rounded-2xl p-6 text-white relative overflow-hidden
        ${net < 0 ? 'bg-rose-500' : 'bg-brand'}
      `}>
        {/* Decorative circles */}
        <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -right-2 bottom-[-2rem] w-20 h-20 rounded-full bg-white/10" />

        {isLoading ? (
          // Show skeleton while loading
          <div className="space-y-3">
            <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
            <div className="h-10 w-48 bg-white/20 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-sm font-medium opacity-80 mb-1 relative z-10">
              {net < 0 ? 'You owe overall' : 'You are owed overall'}
            </p>
            <p className="text-4xl font-bold tracking-tight relative z-10">
              ₹{Math.abs(net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </>
        )}

        {/* Sub-stats row */}
        <div className="flex gap-3 mt-5 relative z-10">
          {[
            { label: 'Owed to me', value: owedMe, Icon: TrendingUp  },
            { label: 'I owe',      value: iOwe,   Icon: TrendingDown },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="flex-1 bg-white/15 rounded-xl px-3 py-2.5">
              <p className="text-[10px] opacity-75 flex items-center gap-1 mb-0.5">
                <Icon className="w-3 h-3" /> {label}
              </p>
              <p className="text-sm font-semibold">
                ₹{value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Friends / balances list ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Balances</h2>
          <button
            onClick={() => navigate('/friends')}
            className="text-xs text-brand font-medium"
          >
            Manage friends
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center py-8 text-red-500 text-sm">
            Failed to load. Pull to refresh.
          </div>
        )}

        {/* Loading state — show 3 skeletons */}
        {isLoading && (
          <div className="space-y-2">
            <FriendCardSkeleton />
            <FriendCardSkeleton />
            <FriendCardSkeleton />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && friends.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No friends yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Add friends to start tracking balances.
            </p>
            <button
              onClick={() => navigate('/friends')}
              className="mt-4 text-brand text-sm font-medium"
            >
              Add your first friend →
            </button>
          </div>
        )}

        {/* Data — friend balance cards */}
        {!isLoading && friends.length > 0 && (
          <div className="space-y-2">
            {friends.map((item: any) => (
              <FriendBalanceCard
                key={item.friend.id}
                item={item}
                onClick={() => navigate(`/ledger/${item.friend.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── FAB — floating add button ─────────────────────────────── */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full
                   bg-brand text-white shadow-lg
                   flex items-center justify-center
                   hover:bg-brand/90 active:scale-95 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add transaction bottom sheet */}
      {showAdd && (
        <AddTransaction onClose={() => setShowAdd(false)} />
      )}

    </div>
  )
}

// ── Extracted sub-component ──────────────────────────────────────────
// When a piece of JSX gets complex, extract it into its own component
// Props defined inline with TypeScript interface

interface FriendBalanceCardProps {
  item: {
    friend:  { id: number; name: string; email: string }
    balance: number
    summary: string
  }
  onClick: () => void
}

function FriendBalanceCard({ item, onClick }: FriendBalanceCardProps) {
  const { friend, balance, summary } = item

  // First letter of name for avatar
  const initial = friend.name.charAt(0).toUpperCase()

  const isPositive = balance > 0  // they owe me
  const isNegative = balance < 0  // I owe them
  const isZero     = balance === 0

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-2xl p-4
                 border border-gray-100 shadow-sm
                 hover:shadow-md active:scale-[0.99]
                 transition-all text-left"
    >
      {/* Avatar circle — colour shows balance direction */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center
        text-sm font-bold text-white flex-shrink-0
        ${isPositive ? 'bg-emerald-400'
        : isNegative ? 'bg-rose-400'
        : 'bg-gray-300'}
      `}>
        {initial}
      </div>

      {/* Name + summary */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">
          {friend.name}
        </p>
        <p className={`text-xs mt-0.5 truncate
          ${isPositive ? 'text-emerald-600'
          : isNegative ? 'text-rose-500'
          : 'text-gray-400'}
        `}>
          {summary}
        </p>
      </div>

      {/* Balance amount */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`font-bold text-sm
          ${isPositive ? 'text-emerald-600'
          : isNegative ? 'text-rose-500'
          : 'text-gray-400'}
        `}>
          {isZero ? 'Settled' : `₹${Math.abs(balance).toLocaleString('en-IN')}`}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  )
}