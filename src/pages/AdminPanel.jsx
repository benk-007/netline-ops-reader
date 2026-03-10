import { useState } from 'react'
import {
  Users, Settings2, Plus, X, Check,
  ShieldCheck, MapPin, LayoutDashboard,
  Mail, Phone, Calendar, Clock,
} from 'lucide-react'
import { ALL_AIRPORTS, SERVICE_COLOR, SERVICE_LABEL } from '../data/FlightData'
import { useAppConfig } from '../contexts/AppConfigContext'
import ramLogo from '../assets/ram_logo.jpg'
import styles from './AdminPanel.module.scss'

// ── Mock users ────────────────────────────────────────────
const INITIAL_USERS = [
  { id: 1, matricule: 'M001', name: 'Ahmed Benali',    role: 'CCO',     airport: null,  active: true,  email: 'a.benali@royalairmaroc.ma',    phone: '+212 6 00 11 22 33', lastLogin: '2026-03-09 08:14', createdAt: '2023-01-15' },
  { id: 2, matricule: 'M002', name: 'Sara Tazi',       role: 'CCO',     airport: null,  active: true,  email: 's.tazi@royalairmaroc.ma',       phone: '+212 6 00 22 33 44', lastLogin: '2026-03-09 07:52', createdAt: '2023-03-20' },
  { id: 3, matricule: 'M003', name: 'Karim Alaoui',    role: 'Station', airport: 'CMN', active: true,  email: 'k.alaoui@royalairmaroc.ma',     phone: '+212 6 00 33 44 55', lastLogin: '2026-03-08 21:30', createdAt: '2022-11-05' },
  { id: 4, matricule: 'M004', name: 'Nadia Idrissi',   role: 'Station', airport: 'RAK', active: true,  email: 'n.idrissi@royalairmaroc.ma',    phone: '+212 6 00 44 55 66', lastLogin: '2026-03-09 06:00', createdAt: '2023-07-11' },
  { id: 5, matricule: 'M005', name: 'Omar Filali',     role: 'Admin',   airport: null,  active: true,  email: 'o.filali@royalairmaroc.ma',     phone: '+212 6 00 55 66 77', lastLogin: '2026-03-09 09:01', createdAt: '2022-05-30' },
  { id: 6, matricule: 'M006', name: 'Lina Benjelloun', role: 'CCO',     airport: null,  active: false, email: 'l.benjelloun@royalairmaroc.ma', phone: '+212 6 00 66 77 88', lastLogin: '2026-02-14 13:45', createdAt: '2023-09-01' },
]

const ROLES = ['CCO', 'Station', 'Admin']

const DEFAULT_THRESHOLDS = { minor: 15, critical: 45 }

// ── AddUserModal ──────────────────────────────────────────
function AddUserModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ matricule: '', name: '', role: 'CCO', airport: 'CMN' })
  const [err, setErr] = useState('')

  function handle(k, v) { setForm(p => ({ ...p, [k]: v })); setErr('') }

  function submit(e) {
    e.preventDefault()
    if (!form.matricule.trim() || !form.name.trim()) { setErr('Fill in all required fields.'); return }
    onAdd({ ...form, id: Date.now(), active: true })
    onClose()
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Add New User</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>
        <form className={styles.modalForm} onSubmit={submit}>
          {err && <div className={styles.modalErr}>{err}</div>}
          <label>
            <span>Matricule *</span>
            <input value={form.matricule} onChange={e => handle('matricule', e.target.value)} placeholder="e.g. M007" />
          </label>
          <label>
            <span>Full Name *</span>
            <input value={form.name} onChange={e => handle('name', e.target.value)} placeholder="First Last" />
          </label>
          <label>
            <span>Role</span>
            <select value={form.role} onChange={e => handle('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {form.role === 'Station' && (
            <label>
              <span>Station Airport</span>
              <select value={form.airport} onChange={e => handle('airport', e.target.value)}>
                {ALL_AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          )}
          <button type="submit" className={styles.modalSubmit}>
            <Check size={14} /> Add User
          </button>
        </form>
      </div>
    </div>
  )
}

// ── User Detail Panel ─────────────────────────────────────
function UserDetail({ user, onClose, onToggleActive }) {
  const roleIcon = { CCO: LayoutDashboard, Station: MapPin, Admin: ShieldCheck }
  const Icon = roleIcon[user.role] ?? ShieldCheck

  const initials = user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h3 className={styles.detailTitle}>User Profile</h3>
        <button className={styles.detailClose} onClick={onClose}><X size={15} /></button>
      </div>

      {/* Avatar + name */}
      <div className={styles.detailAvatar}>
        <div className={`${styles.avatar} ${!user.active ? styles.avatarInactive : ''}`}>
          {initials}
        </div>
        <div>
          <div className={styles.detailName}>{user.name}</div>
          <div className={styles.detailMatricule}>{user.matricule}</div>
        </div>
      </div>

      {/* Role + status badges */}
      <div className={styles.detailBadges}>
        <span className={`${styles.rolePill} ${styles['role' + user.role]}`}>
          <Icon size={11} /> {user.role}
        </span>
        {user.airport && (
          <span className={styles.airportPill}><MapPin size={10} /> {user.airport}</span>
        )}
        <span className={`${styles.statusPill} ${user.active ? styles.statusActive : styles.statusInactive}`}>
          {user.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Info rows */}
      <div className={styles.detailInfo}>
        <div className={styles.infoRow}>
          <Mail size={13} className={styles.infoIcon} />
          <span className={styles.infoVal}>{user.email}</span>
        </div>
        <div className={styles.infoRow}>
          <Phone size={13} className={styles.infoIcon} />
          <span className={styles.infoVal}>{user.phone}</span>
        </div>
        <div className={styles.infoRow}>
          <Clock size={13} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Last login</span>
            <span className={styles.infoVal}>{user.lastLogin}</span>
          </div>
        </div>
        <div className={styles.infoRow}>
          <Calendar size={13} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Created</span>
            <span className={styles.infoVal}>{user.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        className={`${styles.detailAction} ${user.active ? styles.detailDeactivate : styles.detailActivate}`}
        onClick={() => onToggleActive(user.id)}
      >
        {user.active ? 'Deactivate Account' : 'Activate Account'}
      </button>
    </div>
  )
}

// ── AdminPanel ────────────────────────────────────────────
export default function AdminPanel() {
  const { colors, updateColor, resetColors } = useAppConfig()

  const [tab,         setTab]         = useState('users')
  const [users,       setUsers]       = useState(INITIAL_USERS)
  const [showModal,   setShowModal]   = useState(false)
  const [selectedId,  setSelectedId]  = useState(null)
  const [thresholds,  setThresholds]  = useState(DEFAULT_THRESHOLDS)
  const [saved,       setSaved]       = useState(false)

  function addUser(u) {
    setUsers(prev => [...prev, u])
  }

  function toggleActive(id) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u))
  }

  function saveConfig() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const selectedUser = users.find(u => u.id === selectedId) ?? null
  const roleIcon = { CCO: LayoutDashboard, Station: MapPin, Admin: ShieldCheck }

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <ShieldCheck size={20} className={styles.headerIcon} />
          <div>
            <h1 className={styles.pageTitle}>Admin Panel</h1>
            <p className={styles.pageSub}>User management and global configuration</p>
          </div>
        </div>
        <img src={ramLogo} alt="Royal Air Maroc" className={styles.headerLogo} />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'users' ? styles.tabActive : ''}`}
          onClick={() => setTab('users')}
        >
          <Users size={15} /> User Management
        </button>
        <button
          className={`${styles.tab} ${tab === 'config' ? styles.tabActive : ''}`}
          onClick={() => setTab('config')}
        >
          <Settings2 size={15} /> Global Configuration
        </button>
      </div>

      <div className={styles.body}>
        {/* ── User Management ── */}
        {tab === 'users' && (
          <div className={styles.usersLayout}>
            {/* Table + actions */}
            <div className={styles.tableSection}>
              <div className={styles.tableActions}>
                <p className={styles.tableCount}>{users.length} users total</p>
                <button className={styles.addBtn} onClick={() => setShowModal(true)}>
                  <Plus size={14} /> Add User
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Matricule</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Airport</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const Icon = roleIcon[u.role] ?? ShieldCheck
                      const isSelected = u.id === selectedId
                      return (
                        <tr
                          key={u.id}
                          className={[
                            !u.active ? styles.rowInactive : '',
                            styles.rowClickable,
                            isSelected ? styles.rowSelected : '',
                          ].join(' ')}
                          onClick={() => setSelectedId(prev => prev === u.id ? null : u.id)}
                        >
                          <td><code>{u.matricule}</code></td>
                          <td>{u.name}</td>
                          <td>
                            <span className={`${styles.rolePill} ${styles['role' + u.role]}`}>
                              <Icon size={11} /> {u.role}
                            </span>
                          </td>
                          <td>{u.airport ?? '—'}</td>
                          <td>
                            <span className={`${styles.statusPill} ${u.active ? styles.statusActive : styles.statusInactive}`}>
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User detail panel */}
            {selectedUser && (
              <UserDetail
                user={selectedUser}
                onClose={() => setSelectedId(null)}
                onToggleActive={(id) => { toggleActive(id) }}
              />
            )}
          </div>
        )}

        {/* ── Global Configuration ── */}
        {tab === 'config' && (
          <div className={styles.configGrid}>
            {/* Alert thresholds */}
            <div className={styles.configCard}>
              <h3 className={styles.configTitle}>Alert Thresholds</h3>
              <p className={styles.configDesc}>
                Define when a delay triggers Minor or Critical alert status.
              </p>
              <div className={styles.configFields}>
                <label className={styles.configLabel}>
                  <span>Minor Delay (minutes ≥)</span>
                  <input
                    type="number"
                    min={1}
                    max={thresholds.critical - 1}
                    className={styles.configInput}
                    value={thresholds.minor}
                    onChange={e => setThresholds(p => ({ ...p, minor: +e.target.value }))}
                  />
                </label>
                <label className={styles.configLabel}>
                  <span>Critical Delay (minutes ≥)</span>
                  <input
                    type="number"
                    min={thresholds.minor + 1}
                    className={styles.configInput}
                    value={thresholds.critical}
                    onChange={e => setThresholds(p => ({ ...p, critical: +e.target.value }))}
                  />
                </label>
              </div>
            </div>

            {/* Gantt bar colors */}
            <div className={styles.configCard}>
              <h3 className={styles.configTitle}>Gantt Bar Colors</h3>
              <p className={styles.configDesc}>
                Live color mapping for each service type. Changes apply instantly to the Gantt.
              </p>
              <div className={styles.colorList}>
                {/* Scheduled / on-time bar */}
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={colors.scheduled}
                    onChange={e => updateColor('scheduled', e.target.value)}
                  />
                  <span className={styles.colorCode}>SCH</span>
                  <span className={styles.colorLabel}>Scheduled / On-time</span>
                </div>
                {/* Per service-type actual bar colors */}
                {[
                  { key: 'J', label: SERVICE_LABEL.J ?? 'Business' },
                  { key: 'F', label: SERVICE_LABEL.F ?? 'First' },
                  { key: 'P', label: SERVICE_LABEL.P ?? 'Premium Economy' },
                  { key: 'O', label: SERVICE_LABEL.O ?? 'Economy' },
                  { key: 'S', label: SERVICE_LABEL.S ?? 'Shuttle' },
                  { key: 'Z', label: SERVICE_LABEL.Z ?? 'Maintenance (VJ)' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.colorRow}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={colors[key]}
                      onChange={e => updateColor(key, e.target.value)}
                    />
                    <span className={styles.colorCode}>{key}</span>
                    <span className={styles.colorLabel}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* UI Theme colors */}
            <div className={styles.configCard}>
              <h3 className={styles.configTitle}>UI Theme</h3>
              <p className={styles.configDesc}>
                Customize the sidebar and top bar background colors.
              </p>
              <div className={styles.colorList}>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={colors.sidebarBg}
                    onChange={e => updateColor('sidebarBg', e.target.value)}
                  />
                  <span className={styles.colorCode} style={{ width: 'auto' }}>Sidebar</span>
                  <span className={styles.colorLabel}>Side navigation background</span>
                </div>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={colors.topbarBg}
                    onChange={e => updateColor('topbarBg', e.target.value)}
                  />
                  <span className={styles.colorCode} style={{ width: 'auto' }}>Top bar</span>
                  <span className={styles.colorLabel}>Top bar background</span>
                </div>
                <button className={styles.resetBtn} onClick={resetColors}>
                  Reset to defaults
                </button>
              </div>
            </div>

            <div className={styles.configActions}>
              <button className={`${styles.saveBtn} ${saved ? styles.saveBtnOk : ''}`} onClick={saveConfig}>
                {saved ? <><Check size={14} /> Saved!</> : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && <AddUserModal onAdd={addUser} onClose={() => setShowModal(false)} />}
    </div>
  )
}
