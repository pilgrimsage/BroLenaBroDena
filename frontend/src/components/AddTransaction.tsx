import { useState } from 'react'
import { X, Loader2, ChevronDown, Users, Ghost, UserPlus } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useFriends, useGuests, useAddTransaction } from '@/hooks/useApi'
import { useSync } from '@/hooks/useSync'

dayjs.extend(relativeTime)

// Three modes for "who is this transaction with"
type WithMode = 'friend' | 'existing_guest' | 'new_guest'

interface Props {
  onClose:    () => void
  friendId?:  number  // pre-select a registered friend
  guestId?:   number  // pre-select an existing guest contact
}

export default function AddTransaction({
  onClose,
  friendId: preselectedFriendId,
  guestId:  preselectedGuestId,
}: Props) {
  const { data: friends = [] } = useFriends()
  const { data: guests  = [] } = useGuests()
  const addTx                  = useAddTransaction()
  const { isOnline }           = useSync()

  // Determine initial mode from props
  const initialMode: WithMode = preselectedGuestId
    ? 'existing_guest'
    : 'friend'

  // Form state
  const [type,       setType]       = useState<'i_paid' | 'they_paid'>('i_paid')
  const [withMode,   setWithMode]   = useState<WithMode>(initialMode)
  const [friendId,   setFriendId]   = useState<string>(
    preselectedFriendId ? String(preselectedFriendId) : ''
  )
  const [guestId,    setGuestId]    = useState<string>(
    preselectedGuestId ? String(preselectedGuestId) : ''
  )
  const [amount,     setAmount]     = useState('')
  const [note,       setNote]       = useState('')
  const [date,       setDate]       = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [error,      setError]      = useState('')

  // New guest fields
  const [guestName,  setGuestName]  = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  const today = new Date().toISOString().split('T')[0]

  function handleModeChange(mode: WithMode) {
    setWithMode(mode)
    setError('')
    // Reset selections when switching mode
    if (mode !== 'friend')         setFriendId('')
    if (mode !== 'existing_guest') setGuestId('')
    if (mode !== 'new_guest') {
      setGuestName(''); setGuestPhone(''); setGuestEmail('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate "with" selection
    if (withMode === 'friend' && !friendId) {
      setError('Select a friend.'); return
    }
    if (withMode === 'existing_guest' && !guestId) {
      setError('Select a guest contact.'); return
    }
    if (withMode === 'new_guest' && !guestName.trim()) {
      setError('Enter their name.'); return
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount.'); return
    }

    const payload: any = {
      amount:           parseFloat(amount),
      note:             note.trim() || undefined,
      type,
      transaction_date: date,
    }

    if (withMode === 'friend') {
      payload.user_id = parseInt(friendId)
    } else if (withMode === 'existing_guest') {
      payload.guest_id = parseInt(guestId)
    } else {
      payload.guest_name  = guestName.trim()
      payload.guest_phone = guestPhone.trim() || undefined
      payload.guest_email = guestEmail.trim() || undefined
    }

    try {
      await addTx.mutateAsync(payload)
      onClose()
    } catch (err: any) {
      if (err?.isOfflineQueued) { onClose(); return }
      const msg =
        err?.response?.data?.message ??
        (Object.values(err?.response?.data?.errors ?? {}) as string[][])?.[0]?.[0] ??
        'Failed to add.'
      setError(String(msg))
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

  // Unresolved guests only (resolved ones are now real users)
  const unresolvedGuests = (guests as any[]).filter(g => !g.is_resolved)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

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

          {/* I paid / They paid */}
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1">
            {(['i_paid', 'they_paid'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
                  ${type === t
                    ? `bg-white dark:bg-gray-800 shadow
                       ${t === 'i_paid' ? 'text-brand' : 'text-rose-500'}`
                    : 'text-gray-400 dark:text-gray-500'
                  }`}
              >
                {t === 'i_paid' ? '💳 I paid' : '🤝 They paid'}
              </button>
            ))}
          </div>

          {/* With — mode tabs */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              With
            </label>

            {/* Mode selector — only show tabs if no pre-selected ID */}
            {!preselectedFriendId && !preselectedGuestId && (
              <div className="flex gap-1.5 mb-3">
                {([
                  { mode: 'friend'         as WithMode, icon: Users,    label: 'Friend'  },
                  { mode: 'existing_guest' as WithMode, icon: Ghost,    label: 'Guest'   },
                  { mode: 'new_guest'      as WithMode, icon: UserPlus, label: 'New'     },
                ]).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode)}
                    className={`flex-1 flex items-center justify-center gap-1.5
                                py-2 rounded-xl text-xs font-semibold
                                transition-all border
                      ${withMode === mode
                        ? 'bg-brand/10 dark:bg-brand/20 text-brand border-brand/30'
                        : 'bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Friend dropdown */}
            {withMode === 'friend' && (
              <div className="relative">
                <select
                  value={friendId}
                  onChange={e => setFriendId(e.target.value)}
                  disabled={!!preselectedFriendId}
                  className={input + ' appearance-none pr-10 cursor-pointer'}
                >
                  <option value="">Select a friend…</option>
                  {(friends as any[]).map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.phone ? `· ${f.phone}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                        w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Existing guest dropdown */}
            {withMode === 'existing_guest' && (
              unresolvedGuests.length === 0 ? (
                <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                  No guest contacts yet.
                  <button
                    type="button"
                    onClick={() => handleModeChange('new_guest')}
                    className="block mx-auto mt-1 text-brand text-xs font-medium"
                  >
                    Add a new person →
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={guestId}
                    onChange={e => setGuestId(e.target.value)}
                    disabled={!!preselectedGuestId}
                    className={input + ' appearance-none pr-10 cursor-pointer'}
                  >
                    <option value="">Select a guest…</option>
                    {unresolvedGuests.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.phone ? `· ${g.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                          w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )
            )}

            {/* New guest fields */}
            {withMode === 'new_guest' && (
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
                  placeholder="Phone (links when they join app)"
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
                  Add phone so transactions link automatically when they join.
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
            className={`w-full py-3.5 rounded-xl font-bold text-sm text-white
                        flex items-center justify-center gap-2
                        active:scale-[0.98] transition-all disabled:opacity-60
                        ${type === 'i_paid'
                          ? 'bg-brand hover:bg-brand-dark'
                          : 'bg-rose-500 hover:bg-rose-600'}`}
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