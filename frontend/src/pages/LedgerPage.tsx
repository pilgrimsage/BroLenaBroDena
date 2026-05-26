import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle2, XCircle, Clock, Wallet } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useLedger, useRespondTransaction, useAddSettlement, useFriends } from '@/hooks/useApi'
import { useAuthStore } from '@/store/auth'
import { Skeleton } from '@/components/Skeleton'
import AddTransaction from '@/components/AddTransaction'

// Extend dayjs with relative time plugin
// Lets us do dayjs('2024-01-01').fromNow() → "3 days ago"
dayjs.extend(relativeTime)

export default function LedgerPage() {
  const { friendId }  = useParams()
  const navigate      = useNavigate()
  const me            = useAuthStore(s => s.user)
  const id            = Number(friendId)

  const [showAdd, setShowAdd]           = useState(false)
  const [settlingUp, setSettlingUp]     = useState(false)
  const [settleError, setSettleError]   = useState('')

  // Fetch transactions with this friend
  const { data, isLoading } = useLedger(id)
  // data = { balance, transactions: { data: [...], ... } }

  // Get friend's name from friends list
  const { data: friends = [] } = useFriends()
  const friend = friends.find((f: any) => f.id === id)
  const friendName = friend?.name ?? `Friend #${id}`

  // Mutations
  const respond   = useRespondTransaction(id)
  const settle    = useAddSettlement()

  const balance      = data?.balance      ?? 0
  const transactions = data?.transactions?.data ?? []
  // data.transactions is the paginated object
  // .data is the array of records inside it

  // ── Handlers ──────────────────────────────────────────────────────

  async function handleRespond(txId: number, action: 'confirm' | 'dispute') {
    try {
      await respond.mutateAsync({ id: txId, action })
    } catch {
      // Silent fail — UI already shows current state
    }
  }

  async function handleSettleUp() {
    if (balance >= 0) return
    // balance < 0 means I owe them

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

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky header ──────────────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-white border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate(-1)}
            // navigate(-1) = browser back — same as pressing back button
            className="p-1.5 rounded-full hover:bg-gray-100 transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1">
            <p className="font-bold text-gray-900">{friendName}</p>
            {isLoading ? (
              <Skeleton className="h-3 w-24 mt-1" />
            ) : (
              <p className={`text-xs font-medium mt-0.5
                ${balance > 0 ? 'text-emerald-600'
                : balance < 0 ? 'text-rose-500'
                : 'text-gray-400'}
              `}>
                {balance === 0
                  ? 'All settled up ✓'
                  : balance > 0
                    ? `Owes you ₹${balance.toLocaleString('en-IN')}`
                    : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`
                }
              </p>
            )}
          </div>

          {/* Settle up button — only show if I owe them */}
          {balance < 0 && (
            <button
              onClick={handleSettleUp}
              disabled={settlingUp}
              className="flex items-center gap-1.5 bg-brand text-white
                         text-xs font-semibold px-3 py-2 rounded-xl
                         hover:bg-brand/90 active:scale-95 transition-all
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

      {/* ── Transaction list ────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-3">

        {/* Loading */}
        {isLoading && (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}

        {/* Empty */}
        {!isLoading && transactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No transactions yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Tap + to add the first one.
            </p>
          </div>
        )}

        {/* Transaction cards */}
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

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full
                   bg-brand text-white shadow-lg
                   flex items-center justify-center
                   hover:bg-brand/90 active:scale-95 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add transaction — pre-select this friend */}
      {showAdd && (
        <AddTransaction
          friendId={id}
          onClose={() => setShowAdd(false)}
        />
      )}

    </div>
  )
}

// ── TransactionCard sub-component ───────────────────────────────────

interface TxCardProps {
  tx:           any
  myId:         number
  onConfirm:    () => void
  onDispute:    () => void
  isResponding: boolean
}

function TransactionCard({ tx, myId, onConfirm, onDispute, isResponding }: TxCardProps) {
  // Did I create this transaction?
  const createdByMe = tx.creator_id === myId

  // Which direction is money flowing — from my view
  const iPaid = tx.payer_id === myId

  // Can I respond? — I'm involved, I'm not creator, it's pending
  const canRespond = !createdByMe
    && tx.status === 'pending'
    && (tx.payer_id === myId || tx.payee_id === myId)

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start gap-3">

        {/* Direction indicator dot */}
        <div className={`
          w-9 h-9 rounded-full flex items-center justify-center
          flex-shrink-0 font-bold text-sm mt-0.5
          ${iPaid
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-rose-50 text-rose-500'
          }
        `}>
          {iPaid ? '+' : '−'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Note or default label */}
          <p className="font-semibold text-sm text-gray-900">
            {tx.note || (iPaid ? 'You paid' : 'They paid')}
          </p>

          {/* Meta — who paid + when */}
          <p className="text-xs text-gray-400 mt-0.5">
            {createdByMe ? 'Added by you' : `Added by ${tx.creator?.name}`}
            {' · '}
            {dayjs(tx.created_at).fromNow()}
          </p>

          {/* Status badge */}
          <StatusBadge status={tx.status} />

          {/* Confirm / Dispute buttons — only if I can respond */}
          {canRespond && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onConfirm}
                disabled={isResponding}
                className="flex items-center gap-1 text-xs font-semibold
                           bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg
                           hover:bg-emerald-100 active:scale-95 transition-all
                           disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm
              </button>
              <button
                onClick={onDispute}
                disabled={isResponding}
                className="flex items-center gap-1 text-xs font-semibold
                           bg-rose-50 text-rose-500 px-3 py-1.5 rounded-lg
                           hover:bg-rose-100 active:scale-95 transition-all
                           disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Dispute
              </button>
            </div>
          )}

        </div>

        {/* Amount */}
        <p className={`font-bold text-sm flex-shrink-0
          ${iPaid ? 'text-emerald-600' : 'text-rose-500'}
        `}>
          ₹{parseFloat(tx.amount).toLocaleString('en-IN')}
        </p>

      </div>
    </div>
  )
}

// ── Status badge sub-component ───────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  // Map status to colour + icon + label
  const config: Record<string, { colour: string; icon: React.ReactNode; label: string }> = {
    pending: {
      colour: 'bg-amber-50 text-amber-600',
      icon:   <Clock className="w-3 h-3" />,
      label:  'Pending confirmation',
    },
    confirmed: {
      colour: 'bg-emerald-50 text-emerald-600',
      icon:   <CheckCircle2 className="w-3 h-3" />,
      label:  'Confirmed',
    },
    disputed: {
      colour: 'bg-rose-50 text-rose-500',
      icon:   <XCircle className="w-3 h-3" />,
      label:  'Disputed',
    },
  }

  const { colour, icon, label } = config[status] ?? config.pending

  return (
    <span className={`
      inline-flex items-center gap-1 text-[10px] font-semibold
      px-2 py-0.5 rounded-full mt-1.5 ${colour}
    `}>
      {icon} {label}
    </span>
  )
}