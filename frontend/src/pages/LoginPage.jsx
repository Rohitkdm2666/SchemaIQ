import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext.jsx'

const S = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
  },
  glow1: {
    position: 'absolute', top: '20%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600, height: 400,
    background: 'radial-gradient(ellipse, rgba(192,57,43,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute', bottom: 0, right: 0,
    width: 400, height: 400,
    background: 'radial-gradient(ellipse, rgba(41,128,185,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  wrap: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 440,
    padding: '0 20px',
    animation: 'fadeUp 0.5s ease both',
  },
  logoWrap: {
    textAlign: 'center', marginBottom: 32,
  },
  logoBox: {
    width: 64, height: 64,
    background: '#c0392b',
    borderRadius: 18,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, marginBottom: 16,
    boxShadow: '0 20px 60px rgba(192,57,43,0.35)',
  },
  logoName: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 28, fontWeight: 700,
    color: '#f0828a', letterSpacing: '-0.02em',
    display: 'block',
  },
  logoSub: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10, color: '#666680',
    letterSpacing: '0.15em', textTransform: 'uppercase',
    marginTop: 6, display: 'block',
  },
  card: {
    background: '#111118',
    border: '1px solid #1e1e2e',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
  },
  accentBar: {
    height: 2,
    background: 'linear-gradient(to right, #c0392b, #f0828a, transparent)',
  },
  formWrap: { padding: '28px 32px 24px' },
  formTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 15, fontWeight: 700, color: '#e8e8f0', marginBottom: 4,
  },
  formSub: { fontSize: 13, color: '#666680', marginBottom: 24 },
  label: {
    display: 'block',
    fontFamily: "'Space Mono', monospace",
    fontSize: 10, color: '#666680',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: 6,
  },
  input: {
    width: '100%', background: '#16161f',
    border: '1px solid #1e1e2e', borderRadius: 10,
    padding: '11px 14px', fontSize: 13,
    color: '#e8e8f0', fontFamily: "'Space Mono', monospace",
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputFocus: { borderColor: '#c0392b' },
  inputWrap: { marginBottom: 16, position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none',
    color: '#666680', cursor: 'pointer',
    fontSize: 14, padding: 0, lineHeight: 1,
  },
  errorBox: {
    background: 'rgba(192,57,43,0.12)',
    border: '1px solid rgba(192,57,43,0.3)',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 12, color: '#f0828a',
    fontFamily: "'Space Mono', monospace",
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%', background: '#c0392b',
    border: 'none', borderRadius: 10,
    padding: '13px', color: '#fff',
    fontFamily: "'Space Mono', monospace",
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    transition: 'background 0.2s',
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  credsWrap: {
    borderTop: '1px solid #1e1e2e',
    background: '#0d0d14',
    padding: '20px 32px 24px',
  },
  credsTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10, color: '#666680',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: 12,
  },
  credBtn: {
    width: '100%', background: '#16161f',
    border: '1px solid #1e1e2e', borderRadius: 10,
    padding: '11px 14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8, transition: 'all 0.15s',
    textAlign: 'left',
  },
  credAvatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, #c0392b, #f0828a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Space Mono', monospace",
    fontSize: 9, fontWeight: 700, color: '#fff',
    flexShrink: 0,
  },
  credName: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 12, fontWeight: 700, color: '#e8e8f0',
  },
  credRole: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 9, color: '#666680',
    background: '#0a0a0f', padding: '2px 6px',
    borderRadius: 4, marginLeft: 6,
  },
  credEmail: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10, color: '#666680', marginTop: 2,
  },
  refBox: {
    marginTop: 14,
    background: '#16161f',
    border: '1px solid #252540',
    borderRadius: 10, padding: '12px 14px',
  },
  refTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10, color: '#f0828a', marginBottom: 6,
  },
  refRow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11, color: '#666680', lineHeight: 1.8,
  },
  refVal: { color: '#b0b0c8' },
  footer: {
    textAlign: 'center', marginTop: 20,
    fontFamily: "'Space Mono', monospace",
    fontSize: 10, color: '#333348',
  },
  spinner: {
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
}

export default function LoginPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [focusedId, setFocusedId] = useState(false)
  const [focusedPw, setFocusedPw] = useState(false)
  const [hoveredCred, setHoveredCred] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    const result = login(id, password)
    setLoading(false)
    if (result.ok) navigate('/')
    else setError(result.error)
  }

  const quickFill = (cred) => {
    setId(cred.id)
    setPassword(cred.password)
    setError('')
  }

  return (
    <div style={S.page}>
      {/* Background glows */}
      <div style={S.glow1} />
      <div style={S.glow2} />

      <div style={S.wrap}>
        {/* Logo */}
        <div style={S.logoWrap}>
          <div style={S.logoBox}>🧠</div>
          <span style={S.logoName}>SchemaIQ</span>
          <span style={S.logoSub}>AI Data Intelligence Platform</span>
        </div>

        {/* Card */}
        <div style={S.card}>
          <div style={S.accentBar} />

          {/* Form section */}
          <div style={S.formWrap}>
            <div style={S.formTitle}>Admin Sign In</div>
            <div style={S.formSub}>Enter your credentials to access the dashboard</div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={S.inputWrap}>
                <label style={S.label}>Admin ID / Email</label>
                <input
                  type="email"
                  value={id}
                  onChange={e => setId(e.target.value)}
                  onFocus={() => setFocusedId(true)}
                  onBlur={() => setFocusedId(false)}
                  placeholder="admin@schemaiq.ai"
                  required
                  style={{ ...S.input, ...(focusedId ? S.inputFocus : {}) }}
                />
              </div>

              {/* Password */}
              <div style={S.inputWrap}>
                <label style={S.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedPw(true)}
                    onBlur={() => setFocusedPw(false)}
                    placeholder="••••••••••"
                    required
                    style={{ ...S.input, paddingRight: 42, ...(focusedPw ? S.inputFocus : {}) }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={S.eyeBtn}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && <div style={S.errorBox}>⚠ {error}</div>}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !id || !password}
                style={{ ...S.submitBtn, ...(!loading && id && password ? {} : S.submitDisabled) }}
                onMouseEnter={e => { if (!loading && id && password) e.currentTarget.style.background = '#e74c3c' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#c0392b' }}
              >
                {loading
                  ? <><div style={S.spinner} /> Authenticating…</>
                  : '⚡ Sign In to Dashboard'
                }
              </button>
            </form>
          </div>

          {/* Demo credentials */}
          <div style={S.credsWrap}>
            <div style={S.credsTitle}>🔑 Demo Credentials — click to fill</div>

            {DEMO_CREDENTIALS.map((cred, i) => (
              <button
                key={cred.id}
                type="button"
                onClick={() => quickFill(cred)}
                onMouseEnter={() => setHoveredCred(i)}
                onMouseLeave={() => setHoveredCred(null)}
                style={{
                  ...S.credBtn,
                  ...(hoveredCred === i
                    ? { borderColor: '#c0392b', background: 'rgba(192,57,43,0.06)' }
                    : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={S.credAvatar}>{cred.initials}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={S.credName}>{cred.name}</span>
                      <span style={S.credRole}>{cred.role}</span>
                    </div>
                    <div style={S.credEmail}>{cred.id}</div>
                  </div>
                </div>
                <span style={{ color: hoveredCred === i ? '#f0828a' : '#444458', fontSize: 14 }}>→</span>
              </button>
            ))}

            {/* Credential reference box */}
            <div style={S.refBox}>
              <div style={S.refTitle}>📋 Credential Reference</div>
              <div style={S.refRow}>
                ID: <span style={S.refVal}>admin@schemaiq.ai</span>
              </div>
              <div style={S.refRow}>
                Pass: <span style={S.refVal}>Kaizen@2025</span>
              </div>
            </div>
          </div>
        </div>

        <div style={S.footer}>Team Kaizen · Code Apex · SchemaIQ v1.0</div>
      </div>
    </div>
  )
}