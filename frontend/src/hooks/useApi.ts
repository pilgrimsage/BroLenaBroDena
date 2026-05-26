import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

// ── Balance / Dashboard ────────────────────────────────────────────

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn:  () => api.get('/transactions/balances').then(r => r.data),
  })
}

// ── Friends ────────────────────────────────────────────────────────

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn:  () => api.get('/friends').then(r => r.data),
  })
}

export function usePendingRequests() {
  return useQuery({
    queryKey: ['friends', 'pending'],
    queryFn:  () => api.get('/friends/pending').then(r => r.data),
  })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) =>
      api.post('/friends/send', { email }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useRespondFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'accept' | 'decline' }) =>
      api.post(`/friends/${id}/respond`, { action }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) =>
      api.delete(`/friends/${userId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['balances'] })
    },
  })
}

// ── Transactions ───────────────────────────────────────────────────

export function useLedger(friendId: number) {
  return useQuery({
    queryKey: ['ledger', friendId],
    queryFn:  () => api.get(`/transactions/with/${friendId}`).then(r => r.data),
    enabled:  !!friendId,
    // enabled: false = don't fetch until friendId exists
  })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) =>
      api.post('/transactions', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances'] })
      qc.invalidateQueries({ queryKey: ['ledger'] })
    },
  })
}

export function useRespondTransaction(friendId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'confirm' | 'dispute' }) =>
      api.post(`/transactions/${id}/respond`, { action }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ledger', friendId] })
      qc.invalidateQueries({ queryKey: ['balances'] })
    },
  })
}

// ── Settlements ────────────────────────────────────────────────────

export function useSettleSuggestions() {
  return useQuery({
    queryKey: ['settlements', 'suggest'],
    queryFn:  () => api.get('/settlements/suggest').then(r => r.data),
  })
}

export function useAddSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) =>
      api.post('/settlements', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances'] })
      qc.invalidateQueries({ queryKey: ['settlements'] })
    },
  })
}

// ── Notifications ──────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn:  () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
    // Refetch every 30 seconds automatically — keeps unread count fresh
  })
}