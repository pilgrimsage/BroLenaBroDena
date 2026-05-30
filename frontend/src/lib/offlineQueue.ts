import localforage from 'localforage'

// One queued action
export interface QueuedAction {
  id:        string    // unique ID for this action
  type:      string    // 'add_transaction' | 'send_friend_request' | etc.
  payload:   any       // the data to send
  endpoint:  string    // API endpoint
  method:    'POST' | 'PATCH' | 'DELETE'
  createdAt: number    // timestamp
  retries:   number    // how many times we've tried
}

// Storage key
const QUEUE_KEY = 'offline_action_queue'

// ── Read queue ──────────────────────────────────────────────────────

export async function getQueue(): Promise<QueuedAction[]> {
  const queue = await localforage.getItem<QueuedAction[]>(QUEUE_KEY)
  return queue ?? []
}

// ── Add to queue ────────────────────────────────────────────────────

export async function enqueue(
  type:     QueuedAction['type'],
  endpoint: string,
  method:   QueuedAction['method'],
  payload:  any
): Promise<void> {
  const queue = await getQueue()

  const action: QueuedAction = {
    id:        crypto.randomUUID(),
    type,
    payload,
    endpoint,
    method,
    createdAt: Date.now(),
    retries:   0,
  }

  queue.push(action)
  await localforage.setItem(QUEUE_KEY, queue)

  console.log(`[OfflineQueue] Enqueued: ${type}`)
}

// ── Remove from queue ───────────────────────────────────────────────

export async function dequeue(id: string): Promise<void> {
  const queue = await getQueue()
  const filtered = queue.filter(a => a.id !== id)
  await localforage.setItem(QUEUE_KEY, filtered)
}

// ── Count ───────────────────────────────────────────────────────────

export async function queueCount(): Promise<number> {
  const queue = await getQueue()
  return queue.length
}

// ── Clear all ───────────────────────────────────────────────────────

export async function clearQueue(): Promise<void> {
  await localforage.setItem(QUEUE_KEY, [])
}