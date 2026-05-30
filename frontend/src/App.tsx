import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import BottomNav    from '@/components/BottomNav'
import TopBar       from '@/components/TopBar'
import AuthPage     from '@/pages/AuthPage'
import DashboardPage from '@/pages/DashboardPage'
import LedgerPage   from '@/pages/LedgerPage'
import FriendsPage  from '@/pages/FriendsPage'
import ProfilePage  from '@/pages/ProfilePage'
import { registerPush, setupNetworkListener, setupNativeUI } from '@/lib/capacitor'
import OfflineBanner from '@/components/OfflineBanner'
import { useThemeStore } from '@/store/theme'
import GuestContactsPage from '@/pages/GuestContactsPage'
import GuestLedgerPage   from '@/pages/GuestLedgerPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  if (!isLoggedIn) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  const { isLoggedIn, fetchMe } = useAuthStore()
  const location = useLocation()

  const isAuth   = location.pathname === '/auth'
  const isLedger = location.pathname.startsWith('/ledger')

  // Show TopBar: logged in, not auth page, not ledger (has its own header)
  const showTopBar    = isLoggedIn && !isAuth && !isLedger
  // Show BottomNav: logged in, not auth page
  const showBottomNav = isLoggedIn && !isAuth

  const { isDark } = useThemeStore()

  useEffect(() => {
    // Apply saved theme immediately on load
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    if (isLoggedIn) {
      fetchMe()
      registerPush()           // register for push notifications
    }
    setupNativeUI()            // status bar + splash — runs regardless of login
    setupNetworkListener()     // network change listener
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
       <OfflineBanner />
       
      {showTopBar && <TopBar />}

      <main className={`
        ${showTopBar    ? 'pt-14' : ''}
        ${showBottomNav ? 'pb-20' : ''}
      `}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route path="/" element={
            <RequireAuth><DashboardPage /></RequireAuth>
          } />

          <Route path="/ledger/:friendId" element={
            <RequireAuth><LedgerPage /></RequireAuth>
          } />

          <Route path="/friends" element={
            <RequireAuth><FriendsPage /></RequireAuth>
          } />

          <Route path="/profile" element={
            <RequireAuth><ProfilePage /></RequireAuth>
          } />

          <Route path="/guests" element={
  <RequireAuth><GuestContactsPage /></RequireAuth>
} />
<Route path="/guest-ledger/:guestId" element={
  <RequireAuth><GuestLedgerPage /></RequireAuth>
} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  )
}