import React, { useState } from 'react'
import { setOtpPending } from '../lib/otpGate'
import { supabase } from '../lib/supabase'
import './Login.css'

export default function Login({ onSignedIn, timedOut }) {
  const [step, setStep] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const sendOtp = async (targetEmail) => {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: false },
    })
    if (otpError) throw otpError
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const trimmedEmail = email.trim()
      // Block App from treating the password session as a full login.
      setOtpPending(true)

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (signInError) {
        setOtpPending(false)
        setError(signInError.message)
        return
      }

      // Clear password session so dashboard stays locked until OTP succeeds.
      await supabase.auth.signOut()

      await sendOtp(trimmedEmail)
      setEmail(trimmedEmail)
      setOtpCode('')
      setStep('otp')
      setInfo('이메일로 받은 6자리 코드를 입력하세요.')
    } catch (err) {
      setOtpPending(false)
      setError(err.message || '인증 코드 발송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const token = otpCode.trim()
      if (!/^\d{6}$/.test(token)) {
        setError('6자리 숫자 코드를 입력해 주세요.')
        return
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      })
      if (verifyError) {
        setError(verifyError.message)
        return
      }
      if (!data.session) {
        setError('인증에 실패했습니다. 코드를 다시 확인해 주세요.')
        return
      }

      setOtpPending(false)
      onSignedIn(data.session)
    } catch (err) {
      setError(err.message || '인증에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    try {
      await sendOtp(email.trim())
      setInfo('인증 코드를 다시 보냈습니다. 이메일을 확인해 주세요.')
    } catch (err) {
      setError(err.message || '코드 재전송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPassword = async () => {
    setOtpPending(false)
    setStep('password')
    setOtpCode('')
    setError('')
    setInfo('')
    setPassword('')
  }

  return (
    <div className="login-page">
      <aside className="login-brand-panel">
        <div className="login-dot-grid" aria-hidden="true" />
        <div className="login-thread login-thread-2" aria-hidden="true" />
        <div className="login-thread login-thread-3" aria-hidden="true" />
        <div className="login-thread login-thread-4" aria-hidden="true" />
        <div className="login-brand-content">
          <div className="brand-block">
            <div className="grid-logo">ATHERIUM</div>
            <div className="grid-gold-line" aria-hidden="true" />
            <div className="grid-tag">Holdings Administration</div>
          </div>
          <blockquote className="grid-quote">
            &ldquo;Stewardship of enterprises,
            <br />
            across every location, in one place.&rdquo;
          </blockquote>
        </div>
      </aside>

      <div className="login-form-column">
        <div className="login-form-shift">
          <div style={s.card}>
            <div style={s.logoMark}>
              <div style={s.logoA} />
              <div>
                <div style={s.logoText}>ATHERIUM</div>
                <div style={s.logoSub}>Holdings Admin</div>
              </div>
            </div>

            <div style={s.title}>{step === 'otp' ? 'Security code' : 'Sign in'}</div>
            <div style={s.sub}>
              {step === 'otp'
                ? `${email} 으로 보낸 코드를 입력하세요`
                : 'Access the holdings dashboard'}
            </div>

            {timedOut && step === 'password' && (
              <div style={{ ...s.error, marginBottom: 16 }}>
                장시간 활동이 없어 자동으로 로그아웃되었습니다. 다시 로그인해주세요.
              </div>
            )}

            {step === 'password' ? (
              <form onSubmit={handlePasswordSubmit} style={s.form}>
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
                  {loading ? 'Signing in…' : 'Continue'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} style={s.form}>
                <label style={s.label}>
                  Email code
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6자리 코드"
                    required
                    autoComplete="one-time-code"
                    style={{ ...s.input, letterSpacing: 4, fontSize: 16 }}
                  />
                </label>
                {info && <div style={s.info}>{info}</div>}
                {error && <div style={s.error}>{error}</div>}
                <button type="submit" disabled={loading} style={{ ...s.button, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Verifying…' : '확인'}
                </button>
                <div style={s.otpActions}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResend}
                    style={s.linkButton}
                  >
                    코드 재전송
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleBackToPassword}
                    style={s.linkButton}
                  >
                    이메일 변경
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
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
  info: {
    background: 'rgba(201,168,76,0.12)',
    border: '1px solid rgba(201,168,76,0.35)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--gold)',
  },
  otpActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: 'var(--muted)',
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
