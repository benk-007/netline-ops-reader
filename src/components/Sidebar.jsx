import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Activity, Settings, Plane, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/status', icon: Activity, label: 'Flight Status' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Plane size={20} />
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.active : ''].join(' ')
            }
          >
            <Icon size={20} />
          </NavLink>
        ))}
      </nav>

      {/* Logout + RAM brand */}
      <div className={styles.bottom}>
        <button className={styles.logoutBtn} title="Log Out" onClick={handleLogout}>
          <LogOut size={16} />
        </button>
        <div className={styles.ram}>RAM</div>
      </div>
    </aside>
  )
}

