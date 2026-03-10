import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Settings, LogOut, ChevronDown, X, MapPin, ShieldCheck, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'
import styles from './TopBar.module.scss'

// ── Profile Modal ─────────────────────────────────────────
function ProfileModal({ user, onClose }) {
  const roleIcon = { CCO: LayoutDashboard, Station: MapPin, Admin: ShieldCheck }
  const Icon = roleIcon[user?.role] ?? User

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : user?.matricule?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className={styles.profileBackdrop} onClick={onClose}>
      <div className={styles.profileModal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.profileHead}>
          <div className={styles.profileAvatar}>{initials}</div>
          <div className={styles.profileHeadInfo}>
            <div className={styles.profileName}>{user?.name || user?.matricule}</div>
            <div className={styles.profileSub}>{user?.matricule}</div>
          </div>
          <button className={styles.profileClose} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Info rows */}
        <div className={styles.profileBody}>
          <div className={styles.profileRow}>
            <span className={styles.profileRowLabel}>Role</span>
            <span className={`${styles.rolePill} ${styles['role' + user?.role]}`}>
              <Icon size={11} /> {user?.role}
            </span>
          </div>
          <div className={styles.profileRow}>
            <span className={styles.profileRowLabel}>Matricule</span>
            <code className={styles.profileCode}>{user?.matricule}</code>
          </div>
          {user?.airport && (
            <div className={styles.profileRow}>
              <span className={styles.profileRowLabel}>Station</span>
              <span className={styles.profileCode}><MapPin size={11} /> {user.airport}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────
export default function TopBar() {
  const { user, logout } = useAuth()
  const { colors } = useAppConfig()
  const navigate = useNavigate()

  const [open,        setOpen]        = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : user?.matricule?.slice(0, 2).toUpperCase() ?? '??'

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  function handleSettings() {
    setOpen(false)
    navigate('/settings')
  }

  function handleProfile() {
    setOpen(false)
    setShowProfile(true)
  }

  return (
    <>
      <div className={styles.topbar} style={{ background: colors.topbarBg }}>
        {/* Right side: user menu */}
        <div className={styles.right} ref={menuRef}>
          <button
            className={styles.userBtn}
            onClick={() => setOpen(v => !v)}
            aria-label="User menu"
          >
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{user?.name || user?.matricule}</span>
            <ChevronDown
              size={13}
              className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className={styles.dropdown}>
              {/* Identity header */}
              <div className={styles.dropHead}>
                <div className={styles.dropAvatar}>{initials}</div>
                <div>
                  <div className={styles.dropName}>{user?.name || user?.matricule}</div>
                  <div className={styles.dropRole}>{user?.role}</div>
                </div>
              </div>

              <div className={styles.dropDivider} />

              <button className={styles.dropItem} onClick={handleProfile}>
                <User size={14} />
                <span>Profile</span>
              </button>
              <button className={styles.dropItem} onClick={handleSettings}>
                <Settings size={14} />
                <span>Settings</span>
              </button>

              <div className={styles.dropDivider} />

              <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={handleLogout}>
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile modal */}
      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </>
  )
}
