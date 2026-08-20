import React, { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import CalendarPage from './pages/CalendarPage'
import Login from './pages/Login'
import { supabase } from './lib/supabase'

function AdminLayout({ userEmail, onSignOut }) {
  const location = useLocation()
  const pathPage = location.pathname.replace(/^\//, '') || 'dashboard'
  const activePage = ['dashboard', 'customers', 'reports'].includes(pathPage) ? pathPage : 'dashboard'

  const pages = {
    dashboard: <Dashboard />,
    customers: <Customers />,
    reports: <Reports />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activePage={activePage} userEmail={userEmail} onSignOut={onSignOut} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar activePage={activePage} userEmail={userEmail} onSignOut={onSignOut} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Routes>
            <Route path="/dashboard" element={pages.dashboard} />
            <Route path="/customers" element={pages.customers} />
            <Route path="/reports" element={pages.reports} />
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

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--night)', color: 'var(--muted)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Login onSignedIn={setSession} />
  }

  const userEmail = session.user?.email || 'Admin'

  return (
    <Routes>
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/*" element={<AdminLayout userEmail={userEmail} onSignOut={handleSignOut} />} />
    </Routes>
  )
}
