import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Users, Settings2, Plus, X, Check,
  ShieldCheck, MapPin, LayoutDashboard,
  Mail, Phone, Calendar, Clock,
  Upload, Download, ChevronDown, AlertTriangle,
} from 'lucide-react'
import { ALL_AIRPORTS, SERVICE_COLOR, SERVICE_LABEL } from '../data/FlightData'
import { useAppConfig } from '../contexts/AppConfigContext'
import { exportUsersCSV, exportUsersXLSX } from '../utils/exportData'
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

// Blank user row template
const blankRow = () => ({ matricule: '', name: '', role: 'CCO', airport: 'CMN', email: '', phone: '' })

// ── AddUsersModal (multi-row) ──────────────────────────────
function AddUsersModal({ onAdd, onClose }) {
  const [rows, setRows] = useState([blankRow()])
  const [err,  setErr]  = useState('')

  function setRow(i, key, val) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
    setErr('')
  }

  function addRow() { setRows(prev => [...prev, blankRow()]) }

  function removeRow(i) {
    if (rows.length === 1) return
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  function submit(e) {
    e.preventDefault()
    const valid = rows.filter(r => r.matricule.trim() && r.name.trim())
    if (valid.length === 0) { setErr('Each user needs a Matricule and Full Name.'); return }
    const now = Date.now()
    onAdd(valid.map((r, i) => ({
      ...r,
      id:        now + i,
      active:    true,
      lastLogin: '',
      createdAt: new Date().toISOString().slice(0, 10),
      airport:   r.role === 'Station' ? r.airport : null,
    })))
    onClose()
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: 640 }}>
        <div className={styles.modalHeader}>
          <h3>Add Users</h3>
          <span className={styles.modalHint}>Fill each row. All rows with Matricule + Name will be created.</span>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>
        <form className={styles.modalForm} onSubmit={submit}>
          {err && <div className={styles.modalErr}>{err}</div>}

          <div className={styles.multiRowWrap}>
            {rows.map((row, i) => (
              <div key={i} className={styles.userRow}>
                <span className={styles.rowNum}>{i + 1}</span>
                <input
                  className={styles.rowInput}
                  placeholder="Matricule *"
                  value={row.matricule}
                  onChange={e => setRow(i, 'matricule', e.target.value)}
                />
                <input
                  className={`${styles.rowInput} ${styles.rowInputWide}`}
                  placeholder="Full Name *"
                  value={row.name}
                  onChange={e => setRow(i, 'name', e.target.value)}
                />
                <select
                  className={styles.rowSelect}
                  value={row.role}
                  onChange={e => setRow(i, 'role', e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {row.role === 'Station' && (
                  <select
                    className={styles.rowSelect}
                    value={row.airport}
                    onChange={e => setRow(i, 'airport', e.target.value)}
                  >
                    {ALL_AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                )}
                <input
                  className={styles.rowInput}
                  placeholder="Email"
                  value={row.email}
                  onChange={e => setRow(i, 'email', e.target.value)}
                />
                {rows.length > 1 && (
                  <button type="button" className={styles.rowRemove} onClick={() => removeRow(i)}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.addRowBtn} onClick={addRow}>
              <Plus size={13} /> Add Another User
            </button>
            <button type="submit" className={styles.modalSubmit}>
              <Check size={14} /> Create {rows.filter(r => r.matricule.trim() && r.name.trim()).length || rows.length} User(s)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ImportPreviewModal ─────────────────────────────────────
function ImportPreviewModal({ rows, onConfirm, onClose }) {
  // rows: array of { matricule, name, role, airport, email, phone, _valid, _error }
  const valid   = rows.filter(r => r._valid)
  const invalid = rows.filter(r => !r._valid)

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: 700 }}>
        <div className={styles.modalHeader}>
          <h3>Import Preview</h3>
          <span className={styles.modalHint}>
            {valid.length} valid · {invalid.length} invalid (will be skipped)
          </span>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.importPreview}>
          <div className={styles.importTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Matricule</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Airport</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r._valid ? '' : styles.rowInvalid}>
                    <td>{i + 1}</td>
                    <td><code>{r.matricule || '—'}</code></td>
                    <td>{r.name || '—'}</td>
                    <td>{r.role || '—'}</td>
                    <td>{r.airport || '—'}</td>
                    <td>{r.email || '—'}</td>
                    <td>
                      {r._valid
                        ? <span className={styles.importOk}><Check size={11} /> OK</span>
                        : <span className={styles.importErr}><AlertTriangle size={11} /> {r._error}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.importFooter}>
          <button className={styles.modalCancel} onClick={onClose}>Cancel</button>
          {valid.length > 0 && (
            <button className={styles.modalSubmit} onClick={() => { onConfirm(valid); onClose() }}>
              <Check size={14} /> Import {valid.length} User(s)
            </button>
          )}
        </div>
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

      <div className={styles.detailAvatar}>
        <div className={`${styles.avatar} ${!user.active ? styles.avatarInactive : ''}`}>
          {initials}
        </div>
        <div>
          <div className={styles.detailName}>{user.name}</div>
          <div className={styles.detailMatricule}>{user.matricule}</div>
        </div>
      </div>

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

      <div className={styles.detailInfo}>
        <div className={styles.infoRow}>
          <Mail size={13} className={styles.infoIcon} />
          <span className={styles.infoVal}>{user.email || '—'}</span>
        </div>
        <div className={styles.infoRow}>
          <Phone size={13} className={styles.infoIcon} />
          <span className={styles.infoVal}>{user.phone || '—'}</span>
        </div>
        <div className={styles.infoRow}>
          <Clock size={13} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Last login</span>
            <span className={styles.infoVal}>{user.lastLogin || '—'}</span>
          </div>
        </div>
        <div className={styles.infoRow}>
          <Calendar size={13} className={styles.infoIcon} />
          <div>
            <span className={styles.infoLabel}>Created</span>
            <span className={styles.infoVal}>{user.createdAt || '—'}</span>
          </div>
        </div>
      </div>

      <button
        className={`${styles.detailAction} ${user.active ? styles.detailDeactivate : styles.detailActivate}`}
        onClick={() => onToggleActive(user.id)}
      >
        {user.active ? 'Deactivate Account' : 'Activate Account'}
      </button>
    </div>
  )
}

// ── Parse imported file rows ───────────────────────────────
function parseImportRows(rawRows) {
  // Normalize column keys (case-insensitive, trim)
  return rawRows.map(row => {
    const norm = {}
    for (const [k, v] of Object.entries(row)) {
      norm[k.toLowerCase().trim()] = String(v ?? '').trim()
    }
    const r = {
      matricule: norm['matricule'] || norm['mat'] || norm['id'] || '',
      name:      norm['name'] || norm['full name'] || norm['fullname'] || norm['nom'] || '',
      role:      norm['role'] || 'CCO',
      airport:   norm['airport'] || norm['station'] || '',
      email:     norm['email'] || '',
      phone:     norm['phone'] || norm['tel'] || '',
    }
    // Validate role
    if (!ROLES.includes(r.role)) r.role = 'CCO'
    // Validate airport for Station role
    if (r.role === 'Station' && !r.airport) r.airport = 'CMN'

    const missing = []
    if (!r.matricule) missing.push('matricule')
    if (!r.name)      missing.push('name')
    r._valid = missing.length === 0
    r._error = missing.length > 0 ? `Missing: ${missing.join(', ')}` : ''
    return r
  }).filter(r => Object.values(r).some(v => v && v !== '' && !v.startsWith('_')))
}

// ── AdminPanel ────────────────────────────────────────────
export default function AdminPanel() {
  const { colors, updateColor, resetColors } = useAppConfig()

  const [tab,          setTab]          = useState('users')
  const [users,        setUsers]        = useState(INITIAL_USERS)
  const [showModal,    setShowModal]    = useState(false)
  const [importRows,   setImportRows]   = useState(null)
  const [selectedId,   setSelectedId]   = useState(null)
  const [thresholds,   setThresholds]   = useState(DEFAULT_THRESHOLDS)
  const [saved,        setSaved]        = useState(false)
  const [exportOpen,   setExportOpen]   = useState(false)

  const fileInputRef = useRef(null)
  const exportRef    = useRef(null)

  function addUsers(newUsers) {
    const now = Date.now()
    setUsers(prev => [
      ...prev,
      ...newUsers.map((u, i) => ({ ...u, id: now + i })),
    ])
  }

  function toggleActive(id) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u))
  }

  function saveConfig() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Import file handling ──────────────────────────────────
  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target.result)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' })
        setImportRows(parseImportRows(raw))
      } catch (err) {
        alert('Failed to parse file. Make sure it is a valid CSV or Excel file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function confirmImport(valid) {
    const now = Date.now()
    setUsers(prev => [
      ...prev,
      ...valid.map((r, i) => ({
        id:        now + i,
        matricule: r.matricule,
        name:      r.name,
        role:      r.role,
        airport:   r.role === 'Station' ? r.airport : null,
        email:     r.email,
        phone:     r.phone,
        active:    true,
        lastLogin: '',
        createdAt: new Date().toISOString().slice(0, 10),
      })),
    ])
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
            <div className={styles.tableSection}>
              <div className={styles.tableActions}>
                <p className={styles.tableCount}>{users.length} users total</p>

                <div className={styles.actionBtns}>
                  {/* Add users button */}
                  <button className={styles.addBtn} onClick={() => setShowModal(true)}>
                    <Plus size={14} /> Add User(s)
                  </button>

                  {/* Import button */}
                  <button
                    className={styles.importBtn}
                    onClick={() => fileInputRef.current?.click()}
                    title="Import users from CSV or Excel"
                  >
                    <Upload size={14} /> Import
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />

                  {/* Export dropdown */}
                  <div className={styles.exportWrap} ref={exportRef}>
                    <button
                      className={styles.exportBtn}
                      onClick={() => setExportOpen(o => !o)}
                    >
                      <Download size={14} /> Export <ChevronDown size={12} />
                    </button>
                    {exportOpen && (
                      <div className={styles.exportDropdown}>
                        <button onClick={() => { exportUsersCSV(users); setExportOpen(false) }}>
                          Export as CSV
                        </button>
                        <button onClick={() => { exportUsersXLSX(users); setExportOpen(false) }}>
                          Export as Excel (.xlsx)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Import hint */}
              <div className={styles.importHint}>
                <AlertTriangle size={11} />
                CSV / Excel columns: <code>matricule</code>, <code>name</code>, <code>role</code>, <code>airport</code>, <code>email</code>, <code>phone</code>
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

            <div className={styles.configCard}>
              <h3 className={styles.configTitle}>Gantt Bar Colors</h3>
              <p className={styles.configDesc}>
                Live color mapping for each service type. Changes apply instantly to the Gantt.
              </p>
              <div className={styles.colorList}>
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

      {/* Modals */}
      {showModal && (
        <AddUsersModal
          onAdd={addUsers}
          onClose={() => setShowModal(false)}
        />
      )}
      {importRows && (
        <ImportPreviewModal
          rows={importRows}
          onConfirm={confirmImport}
          onClose={() => setImportRows(null)}
        />
      )}
    </div>
  )
}
