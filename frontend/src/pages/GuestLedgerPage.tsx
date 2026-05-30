import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle2, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import api from '@/api/axios'
import { Skeleton } from '@/components/Skeleton'
import AddTransaction from '@/components/AddTransaction'

dayjs.extend(relativeTime)

export default function GuestLedgerPage() {
  const { guestId } = useParams()
  const navigate    = useNavigate()
  const id          = Number(guestId)
  const [showAdd, setShowAdd] = useState(false)

  // Fetch guest info
  const { data: guest } = useQuery({
    queryKey: ['guest', id],
    queryFn:  () => api.get('/guests').then(r =>
      r.data.find((g: any) => g.id === id)
    ),
  })

  // Fetch transactions with this guest
  const { data, isLoading } = useQuery({
    queryKey: ['guest-ledger', id],
    queryFn:  () => api.get(`/transactions/with-guest/${id}`).then(r => r.data),
    enabled:  !!id,
  })

  const transactions = data?.transactions ?? []
  const balance      = data?.balance ?? 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900
                      border-b border-gray-100 dark:border-white/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-gray-100
                       dark:hover:bg-white/10 transition flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-black text-gray-900 dark:text-white">
                {guest?.name ?? 'Guest'}
              </p>
              {/* Guest status */}
              {guest?.is_resolved ? (
                <span className="text-[10px] font-bold bg-emerald-50
                                 dark:bg-emerald-500/10 text-emerald-600
                                 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  ✓ Joined app
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-50
                                 dark:bg-amber-500/10 text-amber-600
                                 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  Not on app yet
                </span>
              )}
            </div>

            <p className={`text-xs font-semibold mt-0.5
              ${balance > 0 ? 'text-emerald-600 dark:text-emerald-400'
              : balance < 0 ? 'text-rose-500'
              : 'text-gray-400'}`}>
              {balance === 0
                ? 'All settled'
                : balance > 0
                  ? `Owes you ₹${Math.abs(balance).toLocaleString('en-IN')}`
                  : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`
              }
            </p>
          </div>
        </div>

        {/* Guest info banner */}
        {!guest?.is_resolved && guest?.phone && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl
                          px-3 py-2.5 text-xs text-blue-600 dark:text-blue-300">
            When {guest.name} joins with {guest.phone},
            these transactions will sync to their account automatically.
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="px-5 py-4 space-y-3">

        {isLoading && [1,2,3].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}

        {!isLoading && transactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              No transactions yet with {guest?.name}.
            </p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
              Tap + to add one.
            </p>
          </div>
        )}

        {transactions.map((tx: any) => (
          <GuestTransactionCard key={tx.id} tx={tx} />
        ))}

      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full
                   bg-brand text-white shadow-lg
                   flex items-center justify-center
                   hover:bg-brand-dark active:scale-95 transition-all z-30">
        <Plus className="w-6 h-6" />
      </button>

      {showAdd && (
        <AddTransaction
          guestId={id}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function GuestTransactionCard({ tx }: { tx: any }) {
  const iPaid = tx.direction === 'i_paid'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4
                    border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center
                         flex-shrink-0 font-black text-sm mt-0.5
                         ${iPaid
                           ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                           : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}>
          {iPaid ? '+' : '−'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-white">
            {tx.note || (iPaid ? 'You paid' : 'They paid')}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {dayjs(tx.created_at).fromNow()}
          </p>
          {/* Guest transactions are auto-confirmed */}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold
                           bg-emerald-50 dark:bg-emerald-500/10
                           text-emerald-600 dark:text-emerald-400
                           px-2 py-0.5 rounded-full mt-1.5">
            <CheckCircle2 className="w-3 h-3" />
            Recorded
          </span>
        </div>

        <p className={`font-black text-sm flex-shrink-0
          ${iPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
          ₹{parseFloat(tx.amount).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  )
}