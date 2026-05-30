import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from './useNetwork'
import { processQueue } from '@/lib/syncQueue'
import { queueCount } from '@/lib/offlineQueue'

export function useSync() {
  const { isOnline, wasOffline } = useNetwork()
  const qc = useQueryClient()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing,      setSyncing]      = useState(false)
  const [lastSyncMsg,  setLastSyncMsg]  = useState('')

  // Update pending count whenever it might change
  async function refreshCount() {
    const count = await queueCount()
    setPendingCount(count)
  }

  // Refresh count on mount and periodically
  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 5000)
    return () => clearInterval(interval)
  }, [])

  // When internet returns → sync queue + refetch all data
  useEffect(() => {
    if (!wasOffline) return

    async function sync() {
      setSyncing(true)
      setLastSyncMsg('')

      const result = await processQueue()
      await refreshCount()

      if (result.succeeded > 0 || result.failed > 0) {
        setLastSyncMsg(
          result.failed === 0
            ? `Synced ${result.succeeded} action${result.succeeded > 1 ? 's' : ''}`
            : `Synced ${result.succeeded}, ${result.failed} failed`
        )
      }

      // Refetch all stale data now we're back online
      await qc.invalidateQueries()

      setSyncing(false)
    }

    sync()
  }, [wasOffline])

  return { isOnline, syncing, pendingCount, lastSyncMsg, refreshCount }
}