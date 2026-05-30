import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'

interface NetworkStatus {
  isOnline:    boolean
  wasOffline:  boolean  // true briefly when coming back online
}

export function useNetwork(): NetworkStatus {
  const [isOnline,   setIsOnline]   = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // ── Native (Capacitor) ──────────────────────────────────────
      // Use Capacitor Network plugin on device

      let setup = async () => {
        // Get initial status
        const status = await Network.getStatus()
        setIsOnline(status.connected)

        // Listen for changes
        Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            // Just came back online
            setWasOffline(true)
            setTimeout(() => setWasOffline(false), 3000)
            // wasOffline is true for 3 seconds — triggers sync
          }
          setIsOnline(status.connected)
        })
      }

      setup()

      return () => { Network.removeAllListeners() }

    } else {
      // ── Browser ─────────────────────────────────────────────────
      // Use browser's built-in online/offline events

      const goOnline = () => {
        setIsOnline(true)
        setWasOffline(true)
        setTimeout(() => setWasOffline(false), 3000)
      }
      const goOffline = () => setIsOnline(false)

      window.addEventListener('online',  goOnline)
      window.addEventListener('offline', goOffline)
      setIsOnline(navigator.onLine)

      return () => {
        window.removeEventListener('online',  goOnline)
        window.removeEventListener('offline', goOffline)
      }
    }
  }, [])

  return { isOnline, wasOffline }
}