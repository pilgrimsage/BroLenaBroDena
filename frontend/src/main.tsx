import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:    1000 * 60 * 5,   // data is fresh for 5 minutes
      gcTime:       1000 * 60 * 60 * 24, // keep in cache for 24 hours
      // gcTime (was cacheTime) — how long unused data stays in cache
      retry: 1,
    },
  },
})

// Saves cache to localStorage
// Every successful query result is persisted
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key:     'friendledger-query-cache',
  // Only persist specific queries (not everything)
  serialize:   JSON.stringify,
  deserialize: JSON.parse,
})

// Detect system preference on very first load
const saved = localStorage.getItem('theme')
if (!saved) {
  // No saved preference — check OS
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (prefersDark) {
    document.documentElement.classList.add('dark')
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge:         1000 * 60 * 60 * 24, // cache valid for 24 hours
        buster:         '1',                  // increment to invalidate old cache
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
)