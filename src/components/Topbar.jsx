import { useState } from 'react'
import { RefreshCw, Search, User, ChevronDown, LogOut, Settings } from 'lucide-react'
import styles from './Topbar.module.css'

const AIRPORTS = [
  { code: 'ALL', name: 'All Airports' },
  { code: 'CMN', name: 'CMN – Casablanca' },
  { code: 'RAK', name: 'RAK – Marrakech' },
  { code: 'AGA', name: 'AGA – Agadir' },
  { code: 'FEZ', name: 'FEZ – Fez' },
  { code: 'TNG', name: 'TNG – Tangier' },
]

export default function Topbar({ filters, onFilterChange }) {
  const [showDropdown, setShowDropdown] = useState(false)

  function handleField(key, val) {
    onFilterChange(prev => ({ ...prev, [key]: val }))
  }

  function handleRefresh() {
    // Notify the GanttTimeline to re-generate data
    window.dispatchEvent(new CustomEvent('gantt-refresh'))
  }

  return (
    <header className={styles.topbar}>
      {/* Left: title */}
      <div className={styles.brand}>
        <h1 className={styles.title}>NetLine Ops Reader</h1>
        <span className={styles.subtitle}>Airline Operations Control</span>
      </div>

      {/* Centre: filters */}
      <div className={styles.filters}>
        <label className={styles.filterGroup}>
          <span className={styles.filterLabel}>FROM</span>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.fromDate}
            onChange={e => handleField('fromDate', e.target.value)}
          />
        </label>

        <label className={styles.filterGroup}>
          <span className={styles.filterLabel}>TO</span>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.toDate}
            onChange={e => handleField('toDate', e.target.value)}
          />
        </label>

        <label className={styles.filterGroup}>
          <span className={styles.filterLabel}>AIRPORT</span>
          <select
            className={styles.filterInput}
            value={filters.airport}
            onChange={e => handleField('airport', e.target.value)}
          >
            {AIRPORTS.map(a => (
              <option key={a.code} value={a.code}>{a.name}</option>
            ))}
          </select>
        </label>

        <label className={styles.filterGroup}>
          <span className={styles.filterLabel}>FLIGHT</span>
          <div className={styles.searchWrap}>
            <Search size={13} className={styles.searchIcon} />
            <input
              type="text"
              className={`${styles.filterInput} ${styles.searchInput}`}
              placeholder="e.g. AT123"
              value={filters.flight}
              onChange={e => handleField('flight', e.target.value)}
            />
          </div>
        </label>

        <button className={styles.refreshBtn} onClick={handleRefresh} title="Refresh">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Right: live badge + user */}
      <div className={styles.rightActions}>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} /> LIVE
        </div>

        <div className={styles.userMenu} onClick={() => setShowDropdown(v => !v)}>
          <div className={styles.avatar}>OCC</div>
          <span className={styles.userName}>Controller</span>
          <ChevronDown size={14} className={showDropdown ? styles.chevronUp : styles.chevron} />

          {showDropdown && (
            <div className={styles.dropdown} onClick={e => e.stopPropagation()}>
              <div className={styles.dropdownHeader}>
                <div className={`${styles.avatar} ${styles.avatarLg}`}>OCC</div>
                <div>
                  <p className={styles.dropdownName}>OCC Controller</p>
                  <p className={styles.dropdownRole}>Operations Control</p>
                </div>
              </div>
              <div className={styles.ddivider} />
              <button className={styles.ddItem}>
                <User size={14} /> Profile
              </button>
              <button className={styles.ddItem}>
                <Settings size={14} /> Settings
              </button>
              <div className={styles.ddivider} />
              <button className={`${styles.ddItem} ${styles.ddDanger}`}>
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
