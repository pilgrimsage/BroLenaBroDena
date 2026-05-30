import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { Network } from '@capacitor/network'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import api from '@/api/axios'

// ── Push notifications ───────────────────────────────────────────────

export async function registerPush(): Promise<void> {
  // Only run on real native device — not in browser
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications: skipped (browser)')
    return
  }

  // Ask user for permission
  const permission = await PushNotifications.requestPermissions()

  if (permission.receive !== 'granted') {
    console.log('Push notification permission denied')
    return
  }

  // Register with FCM
  await PushNotifications.register()

  // Token received from Firebase — send to our Laravel backend
  PushNotifications.addListener('registration', async (token) => {
    console.log('FCM token:', token.value)
    try {
      await api.post('/notifications/fcm-token', {
        fcm_token: token.value,
      })
    } catch {
      // Silently fail — will retry next app open
    }
  })

  // Registration failed
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error)
  })

  // Notification received while app is OPEN (foreground)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received (foreground):', notification)
    // App is open — notification won't show automatically
    // You could show a custom in-app banner here
  })

  // User TAPPED a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data
    console.log('Push tapped:', data)

    // Navigate based on notification type
    handleNotificationTap(data)
  })
}

// Route user to correct page when they tap a notification
function handleNotificationTap(data: any): void {
  const { type } = data

  switch (type) {
    case 'friend_request':
      window.location.href = '/friends'
      break
    case 'transaction':
      // Go to ledger with the relevant friend
      // We'd need to derive friend_id from transaction_id
      window.location.href = '/'
      break
    case 'settlement':
      window.location.href = '/'
      break
    default:
      window.location.href = '/profile'
  }
}

// ── Network status ───────────────────────────────────────────────────

export async function setupNetworkListener(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // Check initial status
  const status = await Network.getStatus()
  console.log('Network:', status.connected ? 'online' : 'offline')

  // Listen for changes
  Network.addListener('networkStatusChange', (status) => {
    if (!status.connected) {
      // Show offline banner — implement in UI
      console.log('Gone offline')
    } else {
      console.log('Back online')
    }
  })
}

// ── Native UI setup ──────────────────────────────────────────────────

export async function setupNativeUI(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // Style the status bar
  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#FFFFFF' })

  // Hide splash screen after app is ready
  await SplashScreen.hide()
}