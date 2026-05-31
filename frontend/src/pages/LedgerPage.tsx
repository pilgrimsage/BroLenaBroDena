import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle2, XCircle, Clock, Wallet } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useLedger, useRespondTransaction, useAddSettlement, useFriends } from '@/hooks/useApi'
import { useAuthStore } from '@/store/auth'
import { Skeleton } from '@/components/Skeleton'
import AddTransaction from '@/components/AddTransaction'

dayjs.extend(relativeTime)

export default function LedgerPage() {
  const { friendId } = useParams()
  const navigate     = useNavigate()
  const me           = useAuthStore(s => s.user)
  const id           = Number(friendId)

  const [showAdd,     setShowAdd]     = useState(false)
  const [settlingUp,  setSettlingUp]  = useState(false)
  const [settleError, setSettleError] = useState('')

  const { data, isLoading }   = useLedger(id)
  const { data: friends = [] } = useFriends()
  const respond                = useRespondTransaction(id)
  const settle                 = useAddSettlement()

  const friend       = (friends as any[]).find(f => f.id === id)
  const friendName   = friend?.name ?? `Friend #${id}`
  const balance      = data?.balance ?? 0
  const transactions = data?.transactions?.data ?? []

  async function handleRespond(txId: number, action: 'confirm' | 'dispute') {
    try {
      await respond.mutateAsync({ id: txId, action })
    } catch {
      // silent — UI refetches and shows current state
    }
  }

  async function handleSettleUp() {
    if (balance >= 0) return
    setSettleError('')
    setSettlingUp(true)
    try {
      await settle.mutateAsync({
        friend_id: id,
        amount:    Math.abs(balance),
        method:    'upi',
      })
      alert(`Settlement of ₹${Math.abs(balance)} initiated! Ask ${friendName} to confirm.`)
    } catch (err: any) {
      setSettleError(err?.response?.data?.message ?? 'Failed to initiate.')
    } finally {
      setSettlingUp(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Sticky header — top-0 because global TopBar is hidden on this page */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900
                      border-b border-gray-100 dark:border-white/5 px-5 py-3">
        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-gray-100
                       dark:hover:bg-white/10 transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex-1">
            <p className="font-bold text-gray-900 dark:text-white">{friendName}</p>
            {isLoading ? (
              <Skeleton className="h-3 w-24 mt-1" />
            ) : (
              <p className={`text-xs font-medium mt-0.5
                ${balance > 0 ? 'text-emerald-600'
                : balance < 0 ? 'text-rose-500'
                : 'text-gray-400'}`}
              >
                {balance === 0
                  ? 'All settled up ✓'
                  : balance > 0
                    ? `Owes you ₹${balance.toLocaleString('en-IN')}`
                    : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`
                }
              </p>
            )}
          </div>

          {balance < 0 && (
            <button
              onClick={handleSettleUp}
              disabled={settlingUp}
              className="flex items-center gap-1.5 bg-brand text-white
                         text-xs font-semibold px-3 py-2 rounded-xl
                         hover:bg-brand-dark active:scale-95 transition-all
                         disabled:opacity-60 flex-shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              {settlingUp ? 'Sending…' : 'Settle up'}
            </button>
          )}
        </div>

        {settleError && (
          <p className="text-xs text-rose-500 mt-2 px-1">{settleError}</p>
        )}
      </div>

      {/* Transaction list */}
      <div className="px-5 py-4 space-y-3">

        {isLoading && (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}

        {!isLoading && transactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 dark:text-gray-500 text-sm">No transactions yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Tap + to add the first one.</p>
          </div>
        )}

        {transactions.map((tx: any) => (
          <TransactionCard
            key={tx.id}
            tx={tx}
            myId={me?.id ?? 0}
            onConfirm={() => handleRespond(tx.id, 'confirm')}
            onDispute={() => handleRespond(tx.id, 'dispute')}
            isResponding={respond.isPending}
          />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full
                   bg-brand text-white shadow-lg
                   flex items-center justify-center
                   hover:bg-brand-dark active:scale-95 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showAdd && (
        <AddTransaction friendId={id} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}

// ── TransactionCard ──────────────────────────────────────────────────

interface TxCardProps {
  tx:           any
  myId:         number
  onConfirm:    () => void
  onDispute:    () => void
  isResponding: boolean
}

function TransactionCard({ tx, myId, onConfirm, onDispute, isResponding }: TxCardProps) {
  const createdByMe = tx.creator_id === myId
  const iPaid       = tx.payer_id === myId
  const canRespond  = !createdByMe
    && tx.status === 'pending'
    && (tx.payer_id === myId || tx.payee_id === myId)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4
                    border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-start gap-3">

        <div className={`w-9 h-9 rounded-full flex items-center justify-center
                         flex-shrink-0 font-bold text-sm mt-0.5
                         ${iPaid
                           ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                           : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}
        >
          {iPaid ? '+' : '−'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {tx.note || (iPaid ? 'You paid' : 'They paid')}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {createdByMe ? 'Added by you' : `Added by ${tx.creator?.name}`}
            {' · '}
            {dayjs(tx.transaction_date || tx.created_at).fromNow()}
          </p>

          <StatusBadge status={tx.status} />

          {canRespond && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onConfirm}
                disabled={isResponding}
                className="flex items-center gap-1 text-xs font-semibold
                           bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600
                           px-3 py-1.5 rounded-lg hover:bg-emerald-100
                           active:scale-95 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
              </button>
              <button
                onClick={onDispute}
                disabled={isResponding}
                className="flex items-center gap-1 text-xs font-semibold
                           bg-rose-50 dark:bg-rose-500/10 text-rose-500
                           px-3 py-1.5 rounded-lg hover:bg-rose-100
                           active:scale-95 transition-all disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Dispute
              </button>
            </div>
          )}
        </div>

        <p className={`font-bold text-sm flex-shrink-0
          ${iPaid ? 'text-emerald-600' : 'text-rose-500'}`}
        >
          ₹{parseFloat(tx.amount).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  )
}

// ── StatusBadge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { colour: string; icon: React.ReactNode; label: string }> = {
    pending: {
      colour: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      icon:   <Clock className="w-3 h-3" />,
      label:  'Pending confirmation',
    },
    confirmed: {
      colour: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      icon:   <CheckCircle2 className="w-3 h-3" />,
      label:  'Confirmed',
    },
    disputed: {
      colour: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
      icon:   <XCircle className="w-3 h-3" />,
      label:  'Disputed',
    },
  }

  const { colour, icon, label } = config[status] ?? config.pending

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
                      px-2 py-0.5 rounded-full mt-1.5 ${colour}`}
    >
      {icon} {label}
    </span>
  )
}