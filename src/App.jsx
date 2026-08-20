import React, { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import CalendarPage from './pages/CalendarPage'
import CommunitySites from './pages/CommunitySites'
import TtkcAdmin from './pages/TtkcAdmin'
import Login from './pages/Login'
import { useIdleLogout } from './hooks/useIdleLogout'
import { isOtpPending, setOtpPending } from './lib/otpGate'
import { supabase } from './lib/supabase'

function AdminLayout({ userEmail, onSignOut }) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathPage = location.pathname.replace(/^\//, '') || 'dashboard'
  const activePage = ['dashboard', 'customers', 'reports', 'community', 'ttkc'].includes(pathPage)
    ? pathPage
    : 'dashboard'

  const pages = {
    dashboard: <Dashboard />,
    customers: <Customers />,
    reports: <Reports />,
    community: <CommunitySites onOpenAdmin={(page) => navigate(`/${page}`)} />,
    ttkc: <TtkcAdmin />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activePage={activePage} userEmail={userEmail} onSignOut={onSignOut} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          activePage={activePage}
          userEmail={userEmail}
          onSignOut={onSignOut}
          onNavigate={(page) => navigate(`/${page}`)}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Routes>
            <Route path="/dashboard" element={pages.dashboard} />
            <Route path="/customers" element={pages.customers} />
            <Route path="/reports" element={pages.reports} />
            <Route path="/community" element={pages.community} />
            <Route path="/ttkc" element={pages.ttkc} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [idleTimedOut, setIdleTimedOut] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(isOtpPending() ? null : data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isOtpPending() && nextSession) {
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

  const userEmail = session.user?.email || 'Admin'

  return (
    <Routes>
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/*" element={<AdminLayout userEmail={userEmail} onSignOut={handleSignOut} />} />
    </Routes>
  )
}