import { useState, useEffect } from 'react'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { useFriends, useAddTransaction } from '@/hooks/useApi'

interface Props {
  onClose:    () => void
  // Optional — pre-select a friend (when opened from LedgerPage)
  friendId?:  number
}

export default function AddTransaction({ onClose, friendId: preselectedId }: Props) {

  // ── Data ──────────────────────────────────────────────────────────
  const { data: friends = [] } = useFriends()
  const addTx = useAddTransaction()

  // ── Form state ────────────────────────────────────────────────────
  const [type,       setType]       = useState<'i_paid' | 'they_paid'>('i_paid')
  const [selectedId, setSelectedId] = useState<string>(
    preselectedId ? String(preselectedId) : ''
  )
  const [amount,     setAmount]     = useState('')
  const [note,       setNote]       = useState('')
  const [error,      setError]      = useState('')

  // Guest mode — person not on app
  const [useGuest,   setUseGuest]   = useState(false)
  const [guestName,  setGuestName]  = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Basic client-side check before hitting API
    if (!useGuest && !selectedId) {
      setError('Select a friend.')
      return
    }
    if (useGuest && !guestName.trim()) {
      setError('Enter their name.')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount.')
      return
    }

    // Build payload based on mode
    const payload: any = {
      amount: parseFloat(amount),
      note:   note.trim() || undefined,
      type,
    }

    if (useGuest) {
      payload.guest_name  = guestName.trim()
      payload.guest_email = guestEmail.trim() || undefined
    } else {
      payload.user_id = parseInt(selectedId)
    }

    try {
      await addTx.mutateAsync(payload)
      onClose()
      // Cache auto-invalidated by useAddTransaction onSuccess
      // Dashboard balance + ledger will refetch automatically
    } catch (err: any) {
      const msg = err?.response?.data?.message
              ?? Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0]
              ?? 'Failed to add.'
      setError(String(msg))
    }
  }

  // ── Shared input style ─────────────────────────────────────────────
  const input = `
    w-full px-4 py-3 rounded-xl text-sm bg-gray-50
    border border-gray-200 focus:outline-none
    focus:ring-2 focus:ring-brand/40 focus:border-brand
    transition-all placeholder:text-gray-400
  `

  // ── JSX ───────────────────────────────────────────────────────────
  return (
    // Backdrop + sheet wrapper
    <div className="fixed inset-0 z-50 flex items-end justify-center">

      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl
                   px-6 pt-3 pb-10 shadow-2xl
                   animate-[slideUp_0.2s_ease-out]"
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">Add transaction</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Type toggle ─────────────────────────────────────── */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {([ 'i_paid', 'they_paid' ] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`
                  flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
                  ${type === t
                    ? `bg-white shadow-sm ${t === 'i_paid' ? 'text-brand' : 'text-rose-500'}`
                    : 'text-gray-400'
                  }
                `}
              >
                {t === 'i_paid' ? '💳 I paid' : '🤝 They paid'}
              </button>
            ))}
          </div>
          {/*
            i_paid   → I lent money → they owe me → balance goes up
            they_paid → they lent → I owe them → balance goes down
          */}

          {/* ── Who ─────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500">With</label>
              <button
                type="button"
                onClick={() => { setUseGuest(g => !g); setError('') }}
                className="text-[11px] text-brand font-medium"
              >
                {useGuest ? '← Choose from friends' : 'Not on app yet?'}
              </button>
            </div>

            {!useGuest ? (
              // Friend selector dropdown
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className={input + ' appearance-none pr-10 cursor-pointer'}
                  disabled={!!preselectedId}
                  // disabled if opened from LedgerPage — friend already known
                >
                  <option value="">Select a friend…</option>
                  {friends.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              // Guest fields
              <div className="space-y-2">
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Their name *"
                  className={input}
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="Their email (optional — for linking later)"
                  className={input}
                />
                <p className="text-[11px] text-gray-400 px-1">
                  When they join FriendLedger with this email, transactions link automatically.
                </p>
              </div>
            )}
          </div>

          {/* ── Amount ──────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                inputMode="decimal"
                // inputMode="decimal" shows numeric keyboard on mobile
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={input + ' pl-8 font-semibold'}
              />
            </div>
          </div>

          {/* ── Note ────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Note <span className="text-gray-300">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Lunch, petrol, movie tickets…"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
              className={input}
            />
          </div>

          {/* ── Error ───────────────────────────────────────────── */}
          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* ── Submit ──────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={addTx.isPending}
            className={`
              w-full py-3.5 rounded-xl font-bold text-sm text-white
              flex items-center justify-center gap-2
              active:scale-[0.98] transition-all disabled:opacity-60
              ${type === 'i_paid'
                ? 'bg-brand hover:bg-brand/90'
                : 'bg-rose-500 hover:bg-rose-600'
              }
            `}
          >
            {addTx.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : null
            }
            {addTx.isPending
              ? 'Adding…'
              : type === 'i_paid'
                ? 'Add — they owe me'
                : 'Add — I owe them'
            }
          </button>

        </form>
      </div>
    </div>
  )
}