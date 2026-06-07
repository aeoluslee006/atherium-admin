import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    if (data.session) onSignedIn(data.session)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoMark}>
          <div style={s.logoA} />
          <div>
            <div style={s.logoText}>ATHERIUM</div>
            <div style={s.logoSub}>Holdings Admin</div>
          </div>
        </div>

        <div style={s.title}>Sign in</div>
        <div style={s.sub}>Access the holdings dashboard</div>

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@atherium.cosmonova.io"
              required
              autoComplete="email"
              style={s.input}
            />
          </label>
          <label style={s.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={s.input}
            />
          </label>
          {error && <div style={s.error}>{error}</div>}
          <button type="submit" disabled={loading} style={{ ...s.button, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--night)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--night3)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '32px 28px',
    boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
  },
  logoMark: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoA: {
    width: 36,
    height: 36,
    flexShrink: 0,
    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
    clipPath: 'polygon(50% 0%,0% 100%,15% 100%,50% 20%,85% 100%,100% 100%)',
  },
  logoText: { fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 600, color: 'var(--gold)', letterSpacing: 2 },
  logoSub: { fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  title: { fontFamily: "'Cinzel', serif", fontSize: 20, color: 'var(--bright)', marginBottom: 4 },
  sub: { fontSize: 12, color: 'var(--muted)', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    background: 'var(--night4)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
  },
  button: {
    marginTop: 8,
    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
    color: 'var(--night)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    background: 'rgba(232,79,79,0.12)',
    border: '1px solid rgba(232,79,79,0.3)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--danger)',
  },
}
