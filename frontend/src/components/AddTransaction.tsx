import { useState } from 'react'
import { X, Loader2, ChevronDown } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useFriends, useAddTransaction } from '@/hooks/useApi'
import { useSync } from '@/hooks/useSync'

dayjs.extend(relativeTime)

interface Props {
  onClose:    () => void
  friendId?:  number  // pre-select a registered friend
  guestId?:   number  // pre-select a guest contact
}

export default function AddTransaction({
  onClose,
  friendId: preselectedFriendId,
  guestId:  preselectedGuestId,
}: Props) {
  const { data: friends = [] } = useFriends()
  const addTx                  = useAddTransaction()
  const { isOnline }           = useSync()

  // Form state
  const [type,       setType]       = useState<'i_paid' | 'they_paid'>('i_paid')
  const [selectedId, setSelectedId] = useState<string>(
    preselectedFriendId ? String(preselectedFriendId) : ''
  )
  const [amount,     setAmount]     = useState('')
  const [note,       setNote]       = useState('')
  const [date,       setDate]       = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [error,      setError]      = useState('')

  // Guest mode
  const [useGuest,   setUseGuest]   = useState(!!preselectedGuestId)
  const [guestName,  setGuestName]  = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

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

    const payload: any = {
      amount:           parseFloat(amount),
      note:             note.trim() || undefined,
      type,
      transaction_date: date,
    }

    if (useGuest) {
      payload.guest_name  = guestName.trim()
      payload.guest_phone = guestPhone.trim() || undefined
      payload.guest_email = guestEmail.trim() || undefined
    } else {
      payload.user_id = parseInt(selectedId)
    }

    try {
      await addTx.mutateAsync(payload)
      onClose()
    } catch (err: any) {
      if (err?.isOfflineQueued) {
        onClose()
        return
      }
      const msg =
        err?.response?.data?.message ??
        (Object.values(err?.response?.data?.errors ?? {}) as string[][])?.[0]?.[0] ??
        'Failed to add.'
      setError(String(msg))
    }
  }

  // Shared input class
  const input = `
    w-full px-4 py-3 rounded-xl text-sm
    bg-gray-50 dark:bg-white/5
    border border-gray-200 dark:border-white/10
    text-gray-900 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand
    transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500
  `

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900
                      rounded-t-3xl px-6 pt-3 pb-10 shadow-2xl
                      animate-[slideUp_0.2s_ease-out]">

        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/20 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            Add transaction
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type toggle */}
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1">
            {(['i_paid', 'they_paid'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`
                  flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
                  ${type === t
                    ? `bg-white dark:bg-gray-800 shadow
                       ${t === 'i_paid' ? 'text-brand' : 'text-rose-500'}`
                    : 'text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                {t === 'i_paid' ? '💳 I paid' : '🤝 They paid'}
              </button>
            ))}
          </div>

          {/* With — friend or guest */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                With
              </label>
              <button
                type="button"
                onClick={() => { setUseGuest(g => !g); setError('') }}
                className="text-[11px] text-brand font-medium"
              >
                {useGuest ? '← Choose from friends' : 'Not on app yet?'}
              </button>
            </div>

            {!useGuest ? (
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  disabled={!!preselectedFriendId}
                  className={input + ' appearance-none pr-10 cursor-pointer'}
                >
                  <option value="">Select a friend…</option>
                  {(friends as any[]).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.phone || f.email || ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                        w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Their name *"
                  className={input}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone (optional — links when they join)"
                  className={input}
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className={input}
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1">
                  Add phone or email so transactions link when they join.
                </p>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2
                               text-gray-400 dark:text-gray-500 font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={input + ' pl-8 font-semibold'}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={today}
                className={input + ' cursor-pointer [color-scheme:light] dark:[color-scheme:dark]'}
              />
              {date === today && (
                <span className="absolute right-10 top-1/2 -translate-y-1/2
                                 text-xs text-gray-400 pointer-events-none">
                  Today
                </span>
              )}
            </div>
            {date !== today && (
              <p className="text-xs text-brand mt-1 px-1">
                {dayjs(date).fromNow()}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Note <span className="text-gray-300 dark:text-gray-600">(optional)</span>
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

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-500 dark:text-rose-400
                          bg-rose-50 dark:bg-rose-500/10 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={addTx.isPending}
            className={`
              w-full py-3.5 rounded-xl font-bold text-sm text-white
              flex items-center justify-center gap-2
              active:scale-[0.98] transition-all disabled:opacity-60
              ${type === 'i_paid' ? 'bg-brand hover:bg-brand-dark' : 'bg-rose-500 hover:bg-rose-600'}
            `}
          >
            {addTx.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {addTx.isPending
              ? 'Adding…'
              : !isOnline
                ? `Save offline (${type === 'i_paid' ? 'they owe me' : 'I owe them'})`
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