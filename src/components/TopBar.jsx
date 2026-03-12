import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, LogOut, Settings, User,
  LayoutDashboard, MapPin, ShieldCheck, Download,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'
import { exportUsersCSV } from '../utils/exportData'
import styles from './TopBar.module.scss'

// ── Live clock ────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hh = time.getHours().toString().padStart(2, '0')
  const mm = time.getMinutes().toString().padStart(2, '0')
  const ss = time.getSeconds().toString().padStart(2, '0')
  const dateStr = time.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  return (
    <div className={styles.clockBlock}>
      <span className={styles.clockTime}>{hh}:{mm}<span className={styles.clockSec}>:{ss}</span></span>
      <span className={styles.clockDate}>{dateStr}</span>
    </div>
  )
}

// ── Role config ────────────────────────────────────────────
const ROLE_META = {
  CCO:     { label: 'CCO',             Icon: LayoutDashboard, cls: 'cco'     },
  Station: { label: 'Station Manager', Icon: MapPin,          cls: 'station' },
  Admin:   { label: 'Administrator',   Icon: ShieldCheck,     cls: 'admin'   },
}

// ── Profile modal ──────────────────────────────────────────
function ProfileModal({ user, onClose, onExport }) {
  const meta     = ROLE_META[user.role] ?? ROLE_META.CCO
  const { Icon } = meta
  const initials = user.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className={styles.profileBackdrop} onClick={onClose}>
      <div className={styles.profileModal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.profileHeader}>
          <div className={styles.profileAvatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{user.name}</span>
            <span className={styles.profileMatricule}>{user.matricule}</span>
          </div>
          <button className={styles.profileClose} onClick={onClose}>✕</button>
        </div>

        {/* Details */}
        <div className={styles.profileBody}>
          <div className={styles.profileRow}>
            <span className={styles.profileRowLabel}>Role</span>
            <span className={`${styles.rolePill} ${styles[meta.cls]}`}>
              <Icon size={11} /> {meta.label}
            </span>
          </div>
          <div className={styles.profileRow}>
            <span className={styles.profileRowLabel}>Matricule</span>
            <span className={styles.profileRowVal}>{user.matricule}</span>
          </div>
          {user.airport && (
            <div className={styles.profileRow}>
              <span className={styles.profileRowLabel}>Station</span>
              <span className={styles.profileRowVal}><MapPin size={11} /> {user.airport}</span>
            </div>
          )}
        </div>

        {/* Export profile */}
        <div className={styles.profileFooter}>
          <button className={styles.exportProfileBtn} onClick={onExport}>
            <Download size={13} /> Export Profile (CSV)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TopBar ──────────────────────────────────────────────────
export default function TopBar() {
  const { user, logout }    = useAuth()
  const { colors }          = useAppConfig()
  const navigate            = useNavigate()
  const dropRef             = useRef(null)

  const [dropOpen,    setDropOpen]    = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  if (!user) return null

  const meta     = ROLE_META[user.role] ?? ROLE_META.CCO
  const { Icon } = meta
  const initials = user.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'U'

  function exportProfile() {
    exportUsersCSV([{
      matricule:  user.matricule,
      name:       user.name,
      role:       user.role,
      airport:    user.airport ?? '',
      email:      user.email   ?? '',
      phone:      user.phone   ?? '',
      active:     true,
      lastLogin:  new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdAt:  '',
    }], `profile-${user.matricule}.csv`)
    setShowProfile(false)
  }

  // Allow topbarBg override from config; default to dark navy
  const bgColor = colors.topbarBg === '#ffffff' ? '#0f172a' : colors.topbarBg

  return (
    <>
      <header className={styles.topbar} style={{ background: bgColor }}>

        {/* ── Left: branding + clock ── */}
        <div className={styles.leftSection}>
          <div className={styles.brandAccent} />
          <div className={styles.brandBlock}>
            <span className={styles.brandName}>NetLine Ops</span>
            <span className={styles.brandSub}>Royal Air Maroc · Operations Control</span>
          </div>
          <div className={styles.divider} />
          <LiveClock />
        </div>

        {/* ── Center: role badge + live ── */}
        <div className={styles.centerSection}>
          <div className={`${styles.roleBadge} ${styles[meta.cls]}`}>
            <Icon size={13} />
            <span>{meta.label}</span>
            {user.airport && (
              <span className={styles.airportChip}>
                <MapPin size={10} /> {user.airport}
              </span>
            )}
          </div>
          <div className={styles.livePill}>
            <span className={styles.liveDot} />
            LIVE
          </div>
        </div>

        {/* ── Right: user dropdown ── */}
        <div className={styles.rightSection} ref={dropRef}>
          <button
            className={styles.userBtn}
            onClick={() => setDropOpen(o => !o)}
          >
            <div className={styles.userAvatar}>{initials}</div>
            <User size={14} className={styles.userIcon} />
            <ChevronDown size={14} className={`${styles.userChevron} ${dropOpen ? styles.chevronUp : ''}`} />
          </button>

          {dropOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropHead}>
                <div className={styles.dropAvatar}>{initials}</div>
                <div>
                  <div className={styles.dropName}>{user.name}</div>
                  <div className={styles.dropRole}>{meta.label}</div>
                </div>
              </div>
              <div className={styles.dropDivider} />
              <button className={styles.dropItem} onClick={() => { setDropOpen(false); setShowProfile(true) }}>
                <User size={14} /> Profile
              </button>
              <button className={styles.dropItem} onClick={() => { setDropOpen(false); navigate('/settings') }}>
                <Settings size={14} /> Settings
              </button>
              <div className={styles.dropDivider} />
              <button
                className={`${styles.dropItem} ${styles.dropLogout}`}
                onClick={() => { logout(); navigate('/login') }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onExport={exportProfile}
        />
      )}
    </>
  )
}
