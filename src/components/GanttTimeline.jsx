import { useRef, useEffect, useState, useCallback } from 'react'
import { Timeline } from 'vis-timeline/standalone'
import { DataSet } from 'vis-data'
import { generateMockData, SERVICE_COLOR, SERVICE_LABEL, ALL_AIRPORTS } from '../data/FlightData'
import { useAppConfig } from '../contexts/AppConfigContext'
import GanttFilterBar from './GanttFilterBar'
import FlightDetailOverlay from './FlightDetailOverlay'
import './GanttTimeline.scss'

const DAY_MS = 24 * 60 * 60 * 1000

function fmt(date) {
  if (!date) return '--:--'
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// Colours that are light enough to need dark text (kept as defaults for reference)
const LIGHT_BG_DEFAULTS = new Set(['#A0AEC0', '#FCA5A5', '#4ADE80', '#38BDF8', '#FEF08A'])

// ── 3-column bar label: {origin depTime} | {flightNo} | {arrTime dest} ──
function makeBarLabel(origin, depTime, flightNo, arrTime, dest, dark = false) {
  const w = document.createElement('div')
  w.className = 'bar-content' + (dark ? ' bar-dark' : '')

  const mkSpan = (cls, text) => {
    const s = document.createElement('span')
    s.className = cls
    s.textContent = text
    return s
  }
  w.appendChild(mkSpan('bar-l', `${origin} ${depTime}`))
  w.appendChild(mkSpan('bar-c', flightNo))
  w.appendChild(mkSpan('bar-r', `${arrTime} ${dest}`))
  return w
}

// ── Luminance check: should text be dark? ────────────────────────────────
function isLight(hex) {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160
}

// ── Build flight pill DOM element ─────────────────────────────────────────
// vis-timeline 7.x sanitises HTML strings, so we always return HTMLElement.
// colors = { scheduled, J, F, P, O, S, Z } from AppConfigContext
function buildItemTemplate(f, colors) {
  const DARK_BLUE   = colors.scheduled
  const ACTUAL_COLOR = { J: colors.J, F: colors.F, P: colors.P, O: colors.O }
  const SINGLE_COLOR = { S: colors.S, Z: colors.Z }

  const outer = document.createElement('div')
  outer.className = 'fp-outer'
  const pill = document.createElement('div')
  pill.className = 'flight-pill'
  outer.appendChild(pill)

  function mkSingle(bg, label) {
    const bar = document.createElement('div')
    bar.className = 'fp-single'
    bar.style.background = bg
    bar.appendChild(makeBarLabel(f.origin, fmt(f.estStart), label, fmt(f.estEnd), f.destination, isLight(bg)))
    pill.appendChild(bar)
  }

  // ── S (shuttle) and Z (maintenance/VJ): always single bar ────────────
  if (SINGLE_COLOR[f.serviceType] !== undefined) {
    mkSingle(SINGLE_COLOR[f.serviceType], f.flightNumber)
    return outer
  }

  const estStartMs = new Date(f.estStart).getTime()
  const estEndMs   = new Date(f.estEnd).getTime()
  const actStartMs = new Date(f.actStart).getTime()
  const actEndMs   = new Date(f.actEnd).getTime()
  const sameTime   = estStartMs === actStartMs && estEndMs === actEndMs

  // ── On-time: single scheduled-colour bar (top position) ──────────────
  if (sameTime) {
    mkSingle(DARK_BLUE, f.flightNumber)
    return outer
  }

  // ── Delayed: dual bar ────────────────────────────────────────────────
  const actBg = ACTUAL_COLOR[f.serviceType] ?? SERVICE_COLOR[f.serviceType] ?? SERVICE_COLOR.default
  pill.classList.add('fp-dual')

  const minStart = Math.min(estStartMs, actStartMs)
  const totalMs  = Math.max(estEndMs, actEndMs) - minStart
  const pct      = ms => (ms - minStart) / totalMs * 100

  const barEst = document.createElement('div')
  barEst.className = 'bar-est'
  barEst.style.cssText =
    `background:${DARK_BLUE};left:${pct(estStartMs)}%;width:${pct(estEndMs) - pct(estStartMs)}%`
  barEst.appendChild(makeBarLabel(f.origin, fmt(f.estStart), f.flightNumber, fmt(f.estEnd), f.destination, isLight(DARK_BLUE)))

  const barAct = document.createElement('div')
  barAct.className = 'bar-act'
  barAct.style.cssText =
    `background:${actBg};left:${pct(actStartMs)}%;width:${pct(actEndMs) - pct(actStartMs)}%`
  barAct.appendChild(makeBarLabel(f.origin, fmt(f.actStart), f.flightNumber, fmt(f.actEnd), f.destination, isLight(actBg)))

  pill.appendChild(barEst)
  pill.appendChild(barAct)
  return outer
}

// ── Build tooltip card DOM element ───────────────────────
function makeEl(tag, cls, text) {
  const el = document.createElement(tag)
  if (cls)  el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

function ttRow(label, value) {
  const row = makeEl('div', 'tt-row')
  row.appendChild(makeEl('span', 'tt-lbl', label))
  row.appendChild(makeEl('span', 'tt-val', value))
  return row
}

function buildTooltip(f) {
  const color  = SERVICE_COLOR[f.serviceType] ?? SERVICE_COLOR.default
  const svcLbl = SERVICE_LABEL[f.serviceType] ?? f.serviceType

  const card = makeEl('div', 'tt-card')

  const head = makeEl('div', 'tt-head')
  head.style.borderLeft = `4px solid ${color}`
  head.appendChild(makeEl('span', 'tt-fno', f.flightNumber))
  const badge = makeEl('span', 'tt-badge', svcLbl)
  badge.style.background = color
  head.appendChild(badge)
  card.appendChild(head)

  const body = makeEl('div', 'tt-body')
  body.appendChild(ttRow('Aircraft',   `${f.aircraft} (${f.aircraftType})`))
  body.appendChild(ttRow('Route',      f.route))
  body.appendChild(ttRow('Passengers', f.paxCount > 0 ? `${f.paxCount} pax` : '—'))
  body.appendChild(ttRow('STD – STA',  `${fmt(f.estStart)} – ${fmt(f.estEnd)}`))

  const status = makeEl('div', 'tt-status')
  if (f.delayMinutes > 0) {
    status.appendChild(makeEl('span', 'tt-delay', `⚠ +${f.delayMinutes}m (${f.delayCode || '—'})`))
  } else {
    status.appendChild(makeEl('span', 'tt-ok', '✓ On Time'))
  }
  body.appendChild(status)
  card.appendChild(body)

  return card
}

// ── Apply filters ─────────────────────────────────────────
function applyFilters(flights, filters) {
  let out = flights
  if (filters.airport)
    out = out.filter(f => f.origin === filters.airport || f.destination === filters.airport)
  if (filters.aircraft)
    out = out.filter(f => f.aircraft === filters.aircraft)
  if (filters.serviceType)
    out = out.filter(f => f.serviceType === filters.serviceType)
  if (filters.flight?.trim()) {
    const q = filters.flight.trim().toLowerCase()
    out = out.filter(f => f.flightNumber.toLowerCase().includes(q))
  }
  return out
}

// ── GanttTimeline ─────────────────────────────────────────
export default function GanttTimeline() {
  const { colors } = useAppConfig()
  const containerRef = useRef(null)
  const timelineRef  = useRef(null)
  const itemsDS      = useRef(null)
  const allFlights   = useRef([])
  const allAircraft  = useRef([])
  const filtersRef   = useRef({})

  const [selected, setSelected] = useState(null)
  const [winLabel, setWinLabel] = useState('')
  const [filters, setFilters]   = useState({
    airport:     '',
    aircraft:    '',
    serviceType: '',
    flight:      '',
  })

  // keep a ref in sync so the refresh event handler can read current filters
  filtersRef.current = filters

  // ── Push items to timeline ────────────────────────────
  const pushItems = useCallback((flights) => {
    if (!itemsDS.current) return
    const items = flights.map(f => ({
      id:      f.id,
      group:   f.group,
      start:   f.start,
      end:     f.end,
      type:    'range',
      content: buildItemTemplate(f, colors),
      title:   buildTooltip(f),
      _flight: f,
    }))
    itemsDS.current.clear()
    itemsDS.current.add(items)
  }, [colors])

  // ── Init timeline (once) ──────────────────────────────
  useEffect(() => {
    const { groups, flights, aircraft } = generateMockData()
    allFlights.current  = flights
    allAircraft.current = aircraft

    const now   = new Date()
    const start = new Date(now.getTime() - DAY_MS * 0.5)
    const end   = new Date(now.getTime() + DAY_MS * 0.5)

    itemsDS.current = new DataSet([])
    const groupsDS  = new DataSet(groups)

    const options = {
      start,
      end,
      min:              new Date(now.getTime() - 7 * DAY_MS),
      max:              new Date(now.getTime() + 4 * DAY_MS),
      height:           '100%',
      maxHeight:        '100%',
      zoomable:         true,
      zoomMin:          1000 * 60 * 30,
      zoomMax:          1000 * 60 * 60 * 24 * 7,
      moveable:         true,
      horizontalScroll: true,
      verticalScroll:   true,
      stack:            false,
      showCurrentTime:  true,
      orientation:      'top',
      tooltip:          { followMouse: true, overflowMethod: 'cap' },
      format: {
        minorLabels: { hour: 'HH:mm', minute: 'HH:mm' },
        majorLabels: { day: 'ddd DD MMM', month: 'MMMM YYYY' },
      },
    }

    const tl = new Timeline(containerRef.current, itemsDS.current, groupsDS, options)
    timelineRef.current = tl

    tl.on('rangechange', ({ start: s, end: e }) => {
      setWinLabel(
        new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
        ' — ' +
        new Date(e).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      )
    })

    tl.on('select', ({ items }) => {
      if (items.length === 0) { setSelected(null); return }
      const item = itemsDS.current.get(items[0])
      if (item?._flight) setSelected(item._flight)
    })

    pushItems(flights)

    const handleRefresh = () => {
      const fresh = generateMockData()
      allFlights.current  = fresh.flights
      allAircraft.current = fresh.aircraft
      pushItems(applyFilters(fresh.flights, filtersRef.current))
    }
    window.addEventListener('gantt-refresh', handleRefresh)

    return () => {
      tl.destroy()
      window.removeEventListener('gantt-refresh', handleRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-filter on filter change ────────────────────────
  useEffect(() => {
    if (!itemsDS.current) return
    pushItems(applyFilters(allFlights.current, filters))
  }, [filters, pushItems])

  // ── Navigation ────────────────────────────────────────
  function goNow() {
    const now = new Date()
    timelineRef.current?.setWindow(
      new Date(now.getTime() - DAY_MS * 0.5),
      new Date(now.getTime() + DAY_MS * 0.5),
      { animation: { duration: 400, easingFunction: 'easeInOutQuad' } }
    )
  }

  function zoom(factor) {
    const tl = timelineRef.current
    if (!tl) return
    const { start, end } = tl.getWindow()
    const mid  = (start.getTime() + end.getTime()) / 2
    const half = (end.getTime() - start.getTime()) * factor / 2
    tl.setWindow(
      new Date(mid - half),
      new Date(mid + half),
      { animation: { duration: 250, easingFunction: 'easeInOutQuad' } }
    )
  }

  return (
    <div className="gantt-wrapper">

      {/* Per-page header / filter bar */}
      <GanttFilterBar
        airports={ALL_AIRPORTS}
        aircraft={allAircraft.current}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Legend */}
      <div className="gantt-legend">
        <div className="legend-items">
          <span className="leg-item">
            <span className="leg-swatch" style={{ background: colors.scheduled }} />Scheduled / On-time
          </span>
          <span className="leg-sep" />
          <span className="leg-item"><span className="leg-swatch" style={{ background: colors.J }} />J actual</span>
          <span className="leg-item"><span className="leg-swatch" style={{ background: colors.F }} />F actual</span>
          <span className="leg-item"><span className="leg-swatch" style={{ background: colors.P }} />P actual</span>
          <span className="leg-item"><span className="leg-swatch" style={{ background: colors.O }} />O actual</span>
          <span className="leg-sep" />
          <span className="leg-item"><span className="leg-swatch" style={{ background: colors.S }} />S</span>
          <span className="leg-item"><span className="leg-swatch" style={{ background: colors.Z }} />VJ</span>
        </div>
      </div>

      {/* Timeline canvas */}
      <div className="gantt-canvas" ref={containerRef} />

      {/* Footer nav */}
      <div className="gantt-footer">
        <span className="gantt-window-label">{winLabel}</span>
        <div className="nav-btns">
          <button className="nav-btn zoom-btn" onClick={() => zoom(0.6)} title="Zoom In">+</button>
          <button className="nav-btn nav-now" onClick={goNow}>Now</button>
          <button className="nav-btn zoom-btn" onClick={() => zoom(1.7)} title="Zoom Out">−</button>
        </div>
      </div>

      {/* Detail overlay */}
      {selected && (
        <FlightDetailOverlay
          flight={selected}
          onClose={() => { setSelected(null); timelineRef.current?.setSelection([]) }}
        />
      )}
    </div>
  )
}
