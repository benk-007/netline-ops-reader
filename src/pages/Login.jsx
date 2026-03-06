import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LogIn, Eye, EyeOff, Plane } from 'lucide-react'
import styles from './Login.module.css'

const ROLES = [
  { value: 'CCO', label: 'CCO – Operations Control' },
  { value: 'Station', label: 'Station Manager' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ matricule: '', password: '', role: 'CCO' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handle(field, val) {
    setForm(p => ({ ...p, [field]: val }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.matricule.trim() || !form.password.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    // Simulate auth delay
    await new Promise(r => setTimeout(r, 700))
    login({ matricule: form.matricule, role: form.role, name: form.matricule })
    navigate(form.role === 'CCO' ? '/dashboard' : '/status', { replace: true })
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      {/* Left panel — branding */}
      <div className={styles.heroPanel}>
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <Plane size={32} />
          </div>
          <h1 className={styles.heroTitle}>NetLine Ops Reader</h1>
          <p className={styles.heroSub}>
            Royal Air Maroc · Operations Control Centre
          </p>
          <div className={styles.heroDivider} />
          <ul className={styles.heroFeatures}>
            <li>Real-time Gantt flight scheduling</li>
            <li>OOOI times &amp; delay monitoring</li>
            <li>35+ aircraft across all routes</li>
          </ul>
        </div>
        <div className={styles.heroFooter}>© 2026 Royal Air Maroc OCC</div>
      </div>

      {/* Right panel — form */}
      <div className={styles.formPanel}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLogo}>
              <span>RAM</span>
            </div>
            <h2 className={styles.cardTitle}>Welcome back</h2>
            <p className={styles.cardSub}>Sign in to your OCC account</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Matricule</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. M123456"
              value={form.matricule}
              onChange={e => handle('matricule', e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.pwdWrap}>
              <input
                className={`${styles.input} ${styles.pwdInput}`}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => handle('password', e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Role</label>
            <select
              className={`${styles.input} ${styles.roleSelect}`}
              value={form.role}
              onChange={e => handle('role', e.target.value)}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <button
            className={styles.loginBtn}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>

          <p className={styles.hint}>
            Any matricule / password combination will work for this demo.
          </p>
        </form>
      </div>
    </div>
  )
}
