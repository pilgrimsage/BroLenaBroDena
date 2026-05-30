import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, ChevronRight, CheckCircle2,
  Clock, Trash2, Search, Phone
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { Skeleton } from '@/components/Skeleton'

export default function GuestContactsPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [search, setSearch]   = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn:  () => api.get('/guests').then(r => r.data),
  })

  const removeGuest = useMutation({
    mutationFn: (id: number) => api.delete(`/guests/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['guests'] }),
  })

  const filtered = guests.filter((g: any) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search) ||
    g.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100
                      dark:border-white/5 px-5 py-4 sticky top-14 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-black text-lg text-gray-900 dark:text-white">
            Guest Contacts
          </h1>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-brand text-white
                       text-xs font-bold px-3 py-2 rounded-xl
                       hover:bg-brand-dark active:scale-95 transition-all">
            <UserPlus className="w-3.5 h-3.5" />
            Add guest
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2
                             w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search guests…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                       bg-gray-100 dark:bg-white/5
                       border border-transparent
                       focus:outline-none focus:border-brand
                       dark:text-white transition-all"
          />
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">

        {/* Loading */}
        {isLoading && [1,2,3].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}

        {/* Empty */}
        {!isLoading && guests.length === 0 && (
          <div className="text-center py-16">
            <UserPlus className="w-10 h-10 text-gray-200 dark:text-white/10
                                 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              No guest contacts yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Add friends who aren't on BrolenaBrodena
            </p>
          </div>
        )}

        {/* Guest cards */}
        {filtered.map((guest: any) => (
          <GuestCard
            key={guest.id}
            guest={guest}
            onViewLedger={() => navigate(`/guest-ledger/${guest.id}`)}
            onRemove={() => {
              if (confirm(`Remove ${guest.name}?`)) {
                removeGuest.mutate(guest.id)
              }
            }}
          />
        ))}

        {/* No search results */}
        {!isLoading && filtered.length === 0 && search && (
          <p className="text-center text-gray-400 text-sm py-8">
            No guests matching "{search}"
          </p>
        )}

        {/* Info card */}
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4
                        border border-blue-100 dark:border-blue-500/20">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">
            How guest contacts work
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
            Add transactions with people not on the app.
            When they join BrolenaBrodena with the same phone number,
            their account links automatically and transactions sync.
          </p>
        </div>

      </div>

      {/* Add guest sheet */}
      {showAdd && (
        <AddGuestSheet
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            qc.invalidateQueries({ queryKey: ['guests'] })
          }}
        />
      )}
    </div>
  )
}

// ── Guest card ────────────────────────────────────────────────────────

function GuestCard({ guest, onViewLedger, onRemove }: any) {
  const isResolved = guest.is_resolved
  const initial    = guest.name.charAt(0).toUpperCase()

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4
                    border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-center gap-3">

        {/* Avatar */}
        <div className="w-11 h-11 rounded-full flex items-center justify-center
                        font-bold text-sm text-white flex-shrink-0
                        bg-gradient-to-br from-brand to-purple-500">
          {initial}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
              {guest.name}
            </p>
            {/* Status badge */}
            {isResolved ? (
              <span className="inline-flex items-center gap-1 text-[10px]
                               font-bold bg-emerald-50 dark:bg-emerald-500/10
                               text-emerald-600 dark:text-emerald-400
                               px-2 py-0.5 rounded-full flex-shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Joined
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px]
                               font-bold bg-amber-50 dark:bg-amber-500/10
                               text-amber-600 dark:text-amber-400
                               px-2 py-0.5 rounded-full flex-shrink-0">
                <Clock className="w-3 h-3" />
                Pending
              </span>
            )}
          </div>

          {/* Contact info */}
          {guest.phone && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5
                          flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {guest.phone}
            </p>
          )}
          {guest.email && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {guest.email}
            </p>
          )}

          {/* If resolved — show who they are now */}
          {isResolved && guest.joined_as && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Now: {guest.joined_as.name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onViewLedger}
            className="flex items-center gap-1 text-xs font-bold
                       text-brand bg-brand/10 px-3 py-2 rounded-xl
                       hover:bg-brand/20 active:scale-95 transition-all">
            Ledger
            <ChevronRight className="w-3 h-3" />
          </button>
          <button onClick={onRemove}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10
                       transition text-gray-300 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Add guest bottom sheet ────────────────────────────────────────────

function AddGuestSheet({ onClose, onAdded }: any) {
  const [name,  setName]  = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Name is required.'); return }
    if (!phone.trim() && !email.trim()) {
      setError('Add at least a phone or email so we can link them later.')
      return
    }

    setLoading(true)
    try {
      await api.post('/guests', { name, phone, email })
      onAdded()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add guest.')
    } finally {
      setLoading(false)
    }
  }

  const input = `
    w-full px-4 py-3 rounded-xl text-sm
    bg-gray-50 dark:bg-white/5
    border border-gray-200 dark:border-white/10
    focus:outline-none focus:ring-2 focus:ring-brand/40
    dark:text-white transition-all placeholder:text-gray-400
  `

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
           onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900
                      rounded-t-3xl px-6 pt-3 pb-10 shadow-2xl
                      animate-[slideUp_0.2s_ease-out]">

        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/20
                        mx-auto mb-5" />
        <h3 className="font-black text-lg text-gray-900 dark:text-white mb-5">
          Add guest contact
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Full name *" className={input} autoFocus />
          <input value={phone} onChange={e => setPhone(e.target.value)}
            type="tel" placeholder="Phone number"
            className={input} />
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="Email address"
            className={input} />
          <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
            Add phone or email so we can auto-link when they join the app.
          </p>

          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10
                          rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white
                       bg-brand hover:bg-brand-dark disabled:opacity-60
                       flex items-center justify-center gap-2
                       active:scale-[0.98] transition-all">
            {loading && <div className="w-4 h-4 border-2 border-white/30
                                        border-t-white rounded-full animate-spin" />}
            {loading ? 'Adding…' : 'Add guest contact'}
          </button>
        </form>
      </div>
    </div>
  )
}