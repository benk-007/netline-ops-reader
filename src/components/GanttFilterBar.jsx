import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, X, Plus, Check, Filter, Bookmark } from 'lucide-react'
import { SERVICE_LABEL, ALL_AIRPORTS } from '../data/FlightData'
import styles from './GanttFilterBar.module.scss'

const LS_SAVED = 'netline_saved_filters'

// ── Load / save saved filters from localStorage ───────────────────────────────
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(LS_SAVED) || '[]') }
  catch { return [] }
}
function persistSaved(list) {
  localStorage.setItem(LS_SAVED, JSON.stringify(list))
}

// ── MultiSelect component ─────────────────────────────────────────────────────
// Shows selected values as removable chips.
// Dropdown is rendered via createPortal + position:fixed so it is never clipped
// by the parent's overflow-x:auto context.
function MultiSelect({ label, values, options, onChange, placeholder = 'All' }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const [pos,   setPos]   = useState({ top: 0, left: 0, width: 200 })

  const wrapRef    = useRef(null)   // the whole filterGroup
  const triggerRef = useRef(null)   // the visible trigger button
  const dropRef    = useRef(null)   // the portal dropdown
  const inputRef   = useRef(null)

  const close = useCallback(() => { setOpen(false); setQuery('') }, [])

  // Close when clicking outside BOTH the trigger and the portal dropdown
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (
        wrapRef.current  && !wrapRef.current.contains(e.target) &&
        dropRef.current  && !dropRef.current.contains(e.target)
      ) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.value.toLowerCase().includes(query.toLowerCase())
  )

  function toggle(val) {
    onChange(values.includes(val)
      ? values.filter(v => v !== val)
      : [...values, val]
    )
  }

  function removeOne(val, e) {
    e.stopPropagation()
    onChange(values.filter(v => v !== val))
  }

  function clearAll(e) {
    e.stopPropagation()
    onChange([])
  }

  function handleOpen() {
    if (open) { close(); return }
    // Calculate position from the trigger element so the portal dropdown
    // aligns correctly regardless of parent overflow context
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 200) })
    }
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const selectedLabels = values.map(v => options.find(o => o.value === v)?.label ?? v)

  // Portal dropdown — rendered at document.body level, never clipped by overflow
  const dropdownPortal = open ? createPortal(
    <div
      ref={dropRef}
      className={styles.dropdown}
      style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
    >
      <div className={styles.dropdownSearch}>
        <Search size={11} className={styles.searchIcon} />
        <input
          ref={inputRef}
          className={styles.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') close()
            if (e.key === 'Enter' && filtered.length > 0) toggle(filtered[0].value)
          }}
          placeholder="Type to search…"
        />
      </div>
      <ul className={styles.optionList}>
        {filtered.length === 0 && (
          <li className={styles.noResults}>No results</li>
        )}
        {filtered.map(opt => {
          const active = values.includes(opt.value)
          return (
            <li
              key={opt.value}
              className={`${styles.option} ${active ? styles.optionActive : ''}`}
              onClick={() => toggle(opt.value)}
            >
              <span className={styles.optionCheck}>
                {active ? <Check size={10} /> : null}
              </span>
              {opt.label}
            </li>
          )
        })}
      </ul>
    </div>,
    document.body
  ) : null

  return (
    <div className={styles.filterGroup} ref={wrapRef}>
      <span className={styles.filterLabel}>{label}</span>
      <div
        ref={triggerRef}
        className={`${styles.multiTrigger} ${open ? styles.open : ''} ${values.length > 0 ? styles.hasValues : ''}`}
        onClick={handleOpen}
      >
        {values.length === 0 ? (
          <span className={styles.placeholder}>{placeholder}</span>
        ) : (
          <div className={styles.chipRow}>
            {selectedLabels.map((lbl, i) => (
              <span key={values[i]} className={styles.chip}>
                {lbl}
                <button
                  className={styles.chipX}
                  onClick={e => removeOne(values[i], e)}
                  title={`Remove ${lbl}`}
                >
                  <X size={8} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className={styles.triggerIcons}>
          {values.length > 0 && (
            <button className={styles.clearBtn} onClick={clearAll} title="Clear all">
              <X size={10} />
            </button>
          )}
          <ChevronDown size={12} className={open ? styles.chevronUp : ''} />
        </div>
      </div>
      {dropdownPortal}
    </div>
  )
}

// ── FlightTagInput ─────────────────────────────────────────────────────────────
// Tag-based input: press Enter or comma to add a flight number tag.
function FlightTagInput({ values, onChange }) {
  const [draft, setDraft] = useState('')

  function addTag() {
    const trimmed = draft.trim().toUpperCase()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setDraft('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  function removeTag(val) {
    onChange(values.filter(v => v !== val))
  }

  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>FLIGHT</span>
      <div className={styles.tagInput}>
        {values.map(v => (
          <span key={v} className={styles.chip}>
            {v}
            <button className={styles.chipX} onClick={() => removeTag(v)}><X size={8} /></button>
          </span>
        ))}
        <input
          className={styles.tagDraftInput}
          value={draft}
          onChange={e => setDraft(e.target.value.toUpperCase())}
          onKeyDown={handleKey}
          onBlur={addTag}
          placeholder={values.length === 0 ? 'e.g. AT123' : ''}
        />
        {values.length > 0 && (
          <button className={styles.clearBtn} onClick={() => onChange([])} title="Clear all flights">
            <X size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── SavedFilterModal ───────────────────────────────────────────────────────────
function SavedFilterModal({ airports, aircraft, onSave, onClose }) {
  const airportOptions  = airports.map(a => ({ value: a, label: a }))
  const aircraftOptions = aircraft.map(a => ({ value: a.id, label: `${a.id} (${a.type})` }))
  const serviceOptions  = Object.entries(SERVICE_LABEL).map(([v, l]) => ({ value: v, label: l }))

  const [name,         setName]         = useState('')
  const [airports_,    setAirports_]    = useState([])
  const [aircraft_,    setAircraft_]    = useState([])
  const [serviceTypes, setServiceTypes] = useState([])
  const [flights,      setFlights]      = useState([])
  const [err,          setErr]          = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) { setErr('Please give this filter a name.'); return }
    if (!airports_.length && !aircraft_.length && !serviceTypes.length && !flights.length) {
      setErr('Add at least one filter criterion.'); return
    }
    onSave({ id: Date.now(), name: name.trim(), airports: airports_, aircraft: aircraft_, serviceTypes, flights })
    onClose()
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <Bookmark size={16} className={styles.modalIcon} />
          <h3>Save Custom Filter</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={15} /></button>
        </div>

        <form className={styles.modalForm} onSubmit={submit}>
          {err && <div className={styles.modalErr}>{err}</div>}

          <label className={styles.modalLabel}>
            <span>Filter name *</span>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setErr('') }}
              placeholder="e.g. CMN Morning Flights"
              className={styles.modalInput}
            />
          </label>

          <div className={styles.modalFilters}>
            <MultiSelect label="AIRPORTS"  values={airports_}    options={airportOptions}  onChange={setAirports_}    placeholder="Any airport" />
            <MultiSelect label="AIRCRAFT"  values={aircraft_}    options={aircraftOptions} onChange={setAircraft_}    placeholder="Any aircraft" />
            <MultiSelect label="SERVICES"  values={serviceTypes} options={serviceOptions}  onChange={setServiceTypes} placeholder="Any service" />
            <FlightTagInput values={flights} onChange={setFlights} />
          </div>

          <button type="submit" className={styles.modalSubmit}>
            <Check size={14} /> Save Filter
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Saved filter pill ──────────────────────────────────────────────────────────
function makeSummary(sf) {
  const parts = []
  if (sf.airports.length)    parts.push(sf.airports.join(', '))
  if (sf.aircraft.length)    parts.push(sf.aircraft.join(', '))
  if (sf.serviceTypes.length) parts.push(sf.serviceTypes.join(', '))
  if (sf.flights.length)     parts.push(sf.flights.join(', '))
  return parts.join(' · ') || 'No criteria'
}

// ── Main filter bar ───────────────────────────────────────────────────────────
const SERVICE_OPTIONS = Object.entries(SERVICE_LABEL).map(([value, label]) => ({ value, label }))

export default function GanttFilterBar({
  airports,
  aircraft,
  filters,
  onFilterChange,
  savedFilters,
  onSavedFiltersChange,
  activeFilterId,
  onActivateFilter,
}) {
  const airportOptions  = airports.map(a => ({ value: a, label: a }))
  const aircraftOptions = aircraft.map(a => ({ value: a.id, label: `${a.id} (${a.type})` }))

  const [showModal, setShowModal] = useState(false)

  function set(key, val) {
    onFilterChange(prev => ({ ...prev, [key]: val }))
    // Deactivate saved filter when manual filter is changed
    if (activeFilterId) onActivateFilter(null)
  }

  function handleSaveFilter(sf) {
    const updated = [...savedFilters, sf]
    onSavedFiltersChange(updated)
    persistSaved(updated)
  }

  function deleteFilter(id, e) {
    e.stopPropagation()
    const updated = savedFilters.filter(f => f.id !== id)
    onSavedFiltersChange(updated)
    persistSaved(updated)
    if (activeFilterId === id) onActivateFilter(null)
  }

  function applyFilter(sf) {
    if (activeFilterId === sf.id) {
      // Deactivate
      onActivateFilter(null)
      onFilterChange({ airports: [], aircraft: [], serviceTypes: [], flights: [] })
    } else {
      onActivateFilter(sf.id)
      onFilterChange({ airports: sf.airports, aircraft: sf.aircraft, serviceTypes: sf.serviceTypes, flights: sf.flights })
    }
  }

  const hasAnyFilter = filters.airports.length || filters.aircraft.length ||
                       filters.serviceTypes.length || filters.flights.length

  return (
    <>
      <header className={styles.filterBar}>
        <div className={styles.brand}>
          <h1 className={styles.title}>NetLine Ops</h1>
          <span className={styles.subtitle}>Gantt · Movement Display</span>
        </div>

        <div className={styles.filters}>
          <MultiSelect
            label="AIRPORT"
            values={filters.airports}
            options={airportOptions}
            onChange={val => set('airports', val)}
            placeholder="All Airports"
          />
          <MultiSelect
            label="AIRCRAFT"
            values={filters.aircraft}
            options={aircraftOptions}
            onChange={val => set('aircraft', val)}
            placeholder="All Aircraft"
          />
          <MultiSelect
            label="SERVICE"
            values={filters.serviceTypes}
            options={SERVICE_OPTIONS}
            onChange={val => set('serviceTypes', val)}
            placeholder="All Services"
          />
          <FlightTagInput
            values={filters.flights}
            onChange={val => set('flights', val)}
          />
          {hasAnyFilter ? (
            <button
              className={styles.clearAllBtn}
              onClick={() => {
                onFilterChange({ airports: [], aircraft: [], serviceTypes: [], flights: [] })
                onActivateFilter(null)
              }}
              title="Clear all filters"
            >
              <X size={11} /> Clear
            </button>
          ) : null}
        </div>

        <div className={styles.rightSection}>
          <button className={styles.addFiltersBtn} onClick={() => setShowModal(true)}>
            <Plus size={12} /> Add Filters
          </button>
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            LIVE
          </div>
        </div>
      </header>

      {/* Saved filter cards row */}
      {savedFilters.length > 0 && (
        <div className={styles.savedRow}>
          <Filter size={12} className={styles.savedRowIcon} />
          <span className={styles.savedRowLabel}>Saved:</span>
          <div className={styles.savedCards}>
            {savedFilters.map(sf => (
              <div
                key={sf.id}
                className={`${styles.savedCard} ${activeFilterId === sf.id ? styles.savedCardActive : ''}`}
                onClick={() => applyFilter(sf)}
                title={makeSummary(sf)}
              >
                <span className={styles.savedCardName}>{sf.name}</span>
                <span className={styles.savedCardSummary}>{makeSummary(sf)}</span>
                <button
                  className={styles.savedCardX}
                  onClick={e => deleteFilter(sf.id, e)}
                  title="Delete filter"
                >
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <SavedFilterModal
          airports={airports}
          aircraft={aircraft}
          onSave={handleSaveFilter}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
