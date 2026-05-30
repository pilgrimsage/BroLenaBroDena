import api from '@/api/axios'
import { getQueue, dequeue, type QueuedAction } from './offlineQueue'

export interface SyncResult {
  succeeded: number
  failed:    number
}

// Process all queued actions
export async function processQueue(): Promise<SyncResult> {
  const queue = await getQueue()

  if (queue.length === 0) return { succeeded: 0, failed: 0 }

  console.log(`[Sync] Processing ${queue.length} queued actions`)

  let succeeded = 0
  let failed    = 0

  // Process one by one in order (important — sequence matters)
  for (const action of queue) {
    try {
      await executeAction(action)
      await dequeue(action.id)
      succeeded++
      console.log(`[Sync] ✓ ${action.type}`)
    } catch (err: any) {
      failed++
      console.error(`[Sync] ✗ ${action.type}:`, err?.response?.data?.message ?? err.message)

      // If server rejected it (4xx) — remove from queue
      // No point retrying a validation error
      const status = err?.response?.status
      if (status && status >= 400 && status < 500) {
        await dequeue(action.id)
        console.log(`[Sync] Removed invalid action: ${action.type}`)
      }
      // 5xx or network error — leave in queue, try again later
    }
  }

  console.log(`[Sync] Done. Success: ${succeeded}, Failed: ${failed}`)
  return { succeeded, failed }
}

// Send one action to the API
async function executeAction(action: QueuedAction): Promise<void> {
  switch (action.method) {
    case 'POST':
      await api.post(action.endpoint, action.payload)
      break
    case 'PATCH':
      await api.patch(action.endpoint, action.payload)
      break
    case 'DELETE':
      await api.delete(action.endpoint)
      break
  }
}