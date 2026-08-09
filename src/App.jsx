import React, { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Login from './pages/Login'
import { useIdleLogout } from './hooks/useIdleLogout'
import { isOtpPending, setOtpPending } from './lib/otpGate'
import { supabase } from './lib/supabase'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [idleTimedOut, setIdleTimedOut] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      // Ignore password-only session while email OTP step is in progress.
      setSession(isOtpPending() ? null : data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isOtpPending() && nextSession) {
        // Keep Login mounted until verifyOtp clears the OTP gate.
        return
      }
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    setOtpPending(false)
    await supabase.auth.signOut()
    setSession(null)
  }

  useIdleLogout(!!session, async () => {
    setIdleTimedOut(true)
    await handleSignOut()
  }, 20 * 60 * 1000)

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--night)', color: 'var(--muted)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (!session) {
    return (
      <Login
        onSignedIn={(next) => {
          setIdleTimedOut(false)
          setOtpPending(false)
          setSession(next)
        }}
        timedOut={idleTimedOut}
      />
    )
  }

  const pages = {
    dashboard: <Dashboard />,
    customers: <Customers />,
    reports: <Reports />,
  }

  const userEmail = session.user?.email || 'Admin'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} userEmail={userEmail} onSignOut={handleSignOut} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar activePage={activePage} userEmail={userEmail} onSignOut={handleSignOut} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {pages[activePage] || <Dashboard />}
        </main>
      </div>
    </div>
  )
}
