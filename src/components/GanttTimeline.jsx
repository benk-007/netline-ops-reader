import { useRef, useEffect, useState, useCallback } from 'react'
import { Timeline } from 'vis-timeline/standalone'
import { DataSet } from 'vis-data'
import { generateMockData, STATUS_COLOR } from '../data/FlightData'
import DetailPanel from './DetailPanel'
import './GanttTimeline.css'

const DAY_MS = 24 * 60 * 60 * 1000

function fmt(date) {
  if (!date) return '--:--'
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// ── Build flight-pill HTML string ──────────────────────────────────────────
function buildItemTemplate(item) {
  const color = STATUS_COLOR[item.status] ?? '#27AE60'
  const fn = item.flightNumber || ''
  const estS = fmt(item.estStart)
  const estE = fmt(item.estEnd)
  const actS = fmt(item.actStart)
  const actE = fmt(item.actEnd)

  return `
    <div class="flight-pill">
      <div class="bar-est" style="background-color:${color}40; border:1px solid ${color};">
        <span class="bar-lbl">${fn} | ETD ${estS} – ETA ${estE}</span>
      </div>
      <div class="bar-act" style="background-color:${color};">
        <span class="bar-lbl bar-lbl-white">${fn} | ATD ${actS} – ATA ${actE}</span>
      </div>
    </div>`
}

// ── Build tooltip HTML card ────────────────────────────────────────────────
function buildTooltip(item) {
  const color = STATUS_COLOR[item.status] ?? '#27AE60'
  const labels = { OnTime: 'On Time', MinorDelay: 'Minor Delay', CriticalDelay: 'Critical Delay' }
  const delayBadge = item.delayMinutes > 0
    ? `<span class="tt-delay">⚠ +${item.delayMinutes}m (${item.delayCode || '—'})</span>`
    : `<span class="tt-ok">✓ On Time</span>`

  return `
    <div class="tt-card">
      <div class="tt-head" style="border-left:4px solid ${color}">
        <span class="tt-fno">${item.flightNumber}</span>
        <span class="tt-badge" style="background:${color}">${labels[item.status] || ''}</span>
      </div>
      <div class="tt-body">
        <div class="tt-row"><span class="tt-lbl">Aircraft</span><span class="tt-val">${item.aircraft}</span></div>
        <div class="tt-row"><span class="tt-lbl">Route</span><span class="tt-val">${item.route}</span></div>
        <div class="tt-row"><span class="tt-lbl">Passengers</span><span class="tt-val">${item.paxCount} pax</span></div>
        <div class="tt-row"><span class="tt-lbl">ETD – ETA</span><span class="tt-val">${fmt(item.estStart)} – ${fmt(item.estEnd)}</span></div>
        <div class="tt-status">${delayBadge}</div>
      </div>
    </div>`
}

// ── Apply filters ──────────────────────────────────────────────────────────
function applyFilters(flights, filters) {
  let out = flights

  if (filters.airport && filters.airport !== 'ALL') {
    out = out.filter(f => f.origin === filters.airport || f.destination === filters.airport)
  }
  if (filters.flight?.trim()) {
    const q = filters.flight.trim().toLowerCase()
    out = out.filter(f => f.flightNumber.toLowerCase().includes(q))
  }
  if (filters.fromDate) {
    const from = new Date(filters.fromDate)
    from.setHours(0, 0, 0, 0)
    out = out.filter(f => new Date(f.estStart) >= from)
  }
  if (filters.toDate) {
    const to = new Date(filters.toDate)
    to.setHours(23, 59, 59, 999)
    out = out.filter(f => new Date(f.estStart) <= to)
  }
  return out
}

export default function GanttTimeline({ filters }) {
  const containerRef = useRef(null)
  const timelineRef = useRef(null)
  const itemsDS = useRef(null)
  const allFlights = useRef([])

  const [selected, setSelected] = useState(null)
  const [winStart, setWinStart] = useState(() => new Date())
  const [winEnd, setWinEnd] = useState(() => new Date(Date.now() + DAY_MS))

  // ── Build/refresh timeline items ─────────────────────────────────────────
  const pushItems = useCallback((flights) => {
    if (!itemsDS.current) return
    const items = flights.map(f => ({
      id: f.id,
      group: f.group,
      start: f.start,
      end: f.end,
      type: 'range',
      content: buildItemTemplate(f),
      title: buildTooltip(f),
      // Data payload for events
      _flight: f,
    }))
    itemsDS.current.clear()
    itemsDS.current.add(items)
  }, [])

  // ── Initialise timeline once on mount ────────────────────────────────────
  useEffect(() => {
    const { groups, flights } = generateMockData()
    allFlights.current = flights

    const now = new Date()
    const start = now
    const end = new Date(now.getTime() + DAY_MS)
    setWinStart(start)
    setWinEnd(end)

    itemsDS.current = new DataSet([])
    const groupsDS = new DataSet(groups)

    const options = {
      start,
      end,
      min: new Date(now.getTime() - 365 * DAY_MS),
      max: new Date(now.getTime() + 365 * DAY_MS),
      height: '100%',
      maxHeight: '100%',
      zoomable: true,
      zoomMin: 1000 * 60 * 60,          // 1 h
      zoomMax: 1000 * 60 * 60 * 24 * 7, // 7 d
      moveable: true,
      horizontalScroll: true,
      verticalScroll: true,
      stack: false,
      showCurrentTime: true,
      orientation: 'top',
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap',
      },
      format: {
        minorLabels: { hour: 'HH:mm', minute: 'HH:mm' },
        majorLabels: { day: 'ddd DD MMM', month: 'MMMM YYYY' },
      },
    }

    const tl = new Timeline(
      containerRef.current,
      itemsDS.current,
      groupsDS,
      options
    )
    timelineRef.current = tl

    // Click handler
    tl.on('select', ({ items }) => {
      if (items.length === 0) { setSelected(null); return }
      const item = itemsDS.current.get(items[0])
      if (item?._flight) setSelected(item._flight)
    })

    pushItems(flights)

    // Refresh event from Topbar button
    const handleRefresh = () => {
      allFlights.current = generateMockData().flights
      pushItems(applyFilters(allFlights.current, filters))
    }
    window.addEventListener('gantt-refresh', handleRefresh)

    return () => {
      tl.destroy()
      window.removeEventListener('gantt-refresh', handleRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-filter when filters prop changes ──────────────────────────────────
  useEffect(() => {
    if (!itemsDS.current) return
    pushItems(applyFilters(allFlights.current, filters))
  }, [filters, pushItems])

  // ── Navigation helpers ────────────────────────────────────────────────────
  function shift(ms) {
    const ns = new Date(winStart.getTime() + ms)
    const ne = new Date(winEnd.getTime() + ms)
    setWinStart(ns); setWinEnd(ne)
    timelineRef.current?.setWindow(ns, ne)
  }

  function goNow() {
    const now = new Date()
    const ne = new Date(now.getTime() + DAY_MS)
    setWinStart(now); setWinEnd(ne)
    timelineRef.current?.setWindow(now, ne)
  }

  return (
    <div className="gantt-wrapper">
      {/* Legend bar */}
      <div className="gantt-legend">
        <div className="legend-items">
          <span className="leg-item"><span className="leg-dot" style={{ background: '#27AE60' }} />On Time</span>
          <span className="leg-item"><span className="leg-dot" style={{ background: '#F39C12' }} />Minor Delay</span>
          <span className="leg-item"><span className="leg-dot" style={{ background: '#D71920' }} />Critical Delay</span>
          <span className="leg-sep" />
          <span className="leg-item">
            <span className="leg-swatch" style={{ border: '1.5px solid #27AE60', background: 'transparent' }} />Scheduled
          </span>
          <span className="leg-item">
            <span className="leg-swatch" style={{ background: '#27AE60' }} />Actual
          </span>
        </div>
      </div>

      {/* Timeline canvas */}
      <div className="gantt-canvas" ref={containerRef} />

      {/* Footer nav */}
      <div className="gantt-footer">
        <span className="gantt-window-label">
          {winStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} —{' '}
          {winEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <div className="nav-btns">
          <button className="nav-btn" onClick={() => shift(-DAY_MS)}>‹ Prev Day</button>
          <button className="nav-btn nav-now" onClick={goNow}>Now</button>
          <button className="nav-btn" onClick={() => shift(+DAY_MS)}>Next Day ›</button>
        </div>
      </div>

      {/* Detail panel overlay */}
      {selected && (
        <DetailPanel
          flight={selected}
          onClose={() => { setSelected(null); timelineRef.current?.setSelection([]) }}
        />
      )}
    </div>
  )
}
