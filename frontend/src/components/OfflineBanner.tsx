import { useSync } from '@/hooks/useSync'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const { isOnline, syncing, pendingCount, lastSyncMsg } = useSync()
  const [showSyncMsg, setShowSyncMsg] = useState(false)

  // Show sync message briefly then hide
  useEffect(() => {
    if (!lastSyncMsg) return
    setShowSyncMsg(true)
    const t = setTimeout(() => setShowSyncMsg(false), 4000)
    return () => clearTimeout(t)
  }, [lastSyncMsg])

  // Online + nothing to show
  if (isOnline && !syncing && !showSyncMsg && pendingCount === 0) {
    return null
  }

  // ── Offline bar ──────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div className="fixed top-0 inset-x-0 max-w-md mx-auto z-50">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <p className="text-xs font-medium flex-1">
            You're offline — showing cached data
          </p>
          {pendingCount > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Syncing bar ──────────────────────────────────────────────────
  if (syncing) {
    return (
      <div className="fixed top-0 inset-x-0 max-w-md mx-auto z-50">
        <div className="bg-brand text-white px-4 py-2.5 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <p className="text-xs font-medium">
            Back online — syncing {pendingCount} action{pendingCount !== 1 ? 's' : ''}…
          </p>
        </div>
      </div>
    )
  }

  // ── Sync done message ────────────────────────────────────────────
  if (showSyncMsg && lastSyncMsg) {
    return (
      <div className="fixed top-0 inset-x-0 max-w-md mx-auto z-50">
        <div className="bg-emerald-500 text-white px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <p className="text-xs font-medium">{lastSyncMsg}</p>
        </div>
      </div>
    )
  }

  // ── Pending actions indicator (online but has queue) ─────────────
  if (pendingCount > 0) {
    return (
      <div className="fixed top-0 inset-x-0 max-w-md mx-auto z-50">
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2">
          <RefreshCw className="w-3 h-3 flex-shrink-0" />
          <p className="text-xs font-medium">
            {pendingCount} action{pendingCount !== 1 ? 's' : ''} waiting to sync
          </p>
        </div>
      </div>
    )
  }

  return null
}