import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Settings,
  LogOut, MapPin, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import ramLogo from '../assets/ram_logo.jpg'
import styles from './Sidebar.module.scss'

const NAV_BY_ROLE = {
  CCO: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Gantt Dashboard' },
    { to: '/status',    icon: Activity,         label: 'Flight Status'   },
    { to: '/settings',  icon: Settings,         label: 'Settings'        },
  ],
  Station: [
    { to: '/station',  icon: MapPin,    label: 'Station View' },
    { to: '/settings', icon: Settings,  label: 'Settings'     },
  ],
  Admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Gantt Dashboard' },
    { to: '/status',    icon: Activity,         label: 'Flight Status'   },
    { to: '/admin',     icon: ShieldCheck,      label: 'Admin Panel'     },
    { to: '/settings',  icon: Settings,         label: 'Settings'        },
  ],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const nav = NAV_BY_ROLE[user?.role] ?? NAV_BY_ROLE.CCO

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <img src={ramLogo} alt="Royal Air Maroc" className={styles.logoIcon} />
      </div>

      {/* Role badge */}
      <div className={styles.roleBadge} title={user?.role}>
        {user?.role === 'Admin'   && <span>ADM</span>}
        {user?.role === 'CCO'     && <span>CCO</span>}
        {user?.role === 'Station' && <span>{user.airport || 'STN'}</span>}
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {nav.map(({ to, icon: Icon, label }) => (
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
        <img src={ramLogo} alt="RAM" className={styles.ramLogo} />
      </div>
    </aside>
  )
}
