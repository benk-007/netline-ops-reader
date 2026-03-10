import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import { SERVICE_LABEL } from '../data/FlightData'
import styles from './GanttFilterBar.module.scss'

// ── Reusable searchable select ────────────────────────────
function SearchSelect({ label, value, options, onChange, placeholder = 'All' }) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.value.toLowerCase().includes(query.toLowerCase())
  )

  const selected = options.find(o => o.value === value)

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleOpen() {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSelect(opt) {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
    if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0])
  }

  return (
    <div className={styles.filterGroup} ref={wrapRef}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={`${styles.selectTrigger} ${open ? styles.open : ''}`} onClick={handleOpen}>
        <span className={`${styles.selectValue} ${!selected ? styles.placeholder : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <div className={styles.selectIcons}>
          {value && (
            <button className={styles.clearBtn} onClick={handleClear} title="Clear">
              <X size={10} />
            </button>
          )}
          <ChevronDown size={12} className={open ? styles.chevronUp : ''} />
        </div>
      </div>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownSearch}>
            <Search size={11} className={styles.searchIcon} />
            <input
              ref={inputRef}
              className={styles.searchInput}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search…"
            />
          </div>
          <ul className={styles.optionList}>
            {filtered.length === 0 && (
              <li className={styles.noResults}>No results</li>
            )}
            {filtered.map(opt => (
              <li
                key={opt.value}
                className={`${styles.option} ${opt.value === value ? styles.optionActive : ''}`}
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Main filter bar ───────────────────────────────────────
const SERVICE_OPTIONS = Object.entries(SERVICE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

export default function GanttFilterBar({
  airports,
  aircraft,
  filters,
  onFilterChange,
}) {
  const airportOptions = airports.map(a => ({ value: a, label: a }))
  const aircraftOptions = aircraft.map(a => ({ value: a.id, label: `${a.id} (${a.type})` }))

  function set(key, val) {
    onFilterChange(prev => ({ ...prev, [key]: val }))
  }

  return (
    <header className={styles.filterBar}>
      <div className={styles.brand}>
        <h1 className={styles.title}>NetLine Ops</h1>
        <span className={styles.subtitle}>Gantt · Movement Display</span>
      </div>

      <div className={styles.filters}>
        <SearchSelect
          label="AIRPORT"
          value={filters.airport}
          options={airportOptions}
          onChange={val => set('airport', val)}
          placeholder="All Airports"
        />
        <SearchSelect
          label="AIRCRAFT"
          value={filters.aircraft}
          options={aircraftOptions}
          onChange={val => set('aircraft', val)}
          placeholder="All Aircraft"
        />
        <SearchSelect
          label="SERVICE"
          value={filters.serviceType}
          options={SERVICE_OPTIONS}
          onChange={val => set('serviceType', val)}
          placeholder="All Services"
        />

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>FLIGHT</span>
          <div className={styles.searchWrap}>
            <Search size={12} className={styles.flightSearchIcon} />
            <input
              type="text"
              className={styles.flightInput}
              placeholder="e.g. AT123"
              value={filters.flight}
              onChange={e => set('flight', e.target.value)}
            />
          </div>
        </div>

      </div>

      <div className={styles.rightSection}>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          LIVE
        </div>
      </div>
    </header>
  )
}
