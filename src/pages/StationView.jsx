import { useState, useMemo } from 'react'
import { Plane, Clock, AlertTriangle, CheckCircle, MapPin, Timer } from 'lucide-react'
import { generateMockData, SERVICE_COLOR } from '../data/FlightData'
import { useAuth } from '../auth/AuthContext'
import styles from './StationView.module.scss'

const { flights: ALL_FLIGHTS } = generateMockData()

function fmtTime(date) {
  if (!date) return '--:--'
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_META = {
  OnTime:       { label: 'On Time',       cls: 'green',  Icon: CheckCircle  },
  MinorDelay:   { label: 'Minor Delay',   cls: 'orange', Icon: AlertTriangle },
  CriticalDelay:{ label: 'Critical Delay',cls: 'red',    Icon: AlertTriangle },
}

function FlightRow({ flight, direction }) {
  const meta  = STATUS_META[flight.status] ?? STATUS_META.OnTime
  const color = SERVICE_COLOR[flight.serviceType] ?? SERVICE_COLOR.default
  const { Icon } = meta

  return (
    <div className={styles.row} style={{ borderLeftColor: color }}>
      <div className={styles.rowDir}>
        <span className={`${styles.dirBadge} ${direction === 'ARR' ? styles.dirArr : styles.dirDep}`}>
          {direction === 'ARR' ? '↓ ARR' : '↑ DEP'}
        </span>
      </div>

      <div className={styles.rowFlight}>
        <span className={styles.flightNo}>{flight.flightNumber}</span>
        <span className={styles.aircraftLbl}>{flight.aircraft}</span>
      </div>

      <div className={styles.rowRoute}>
        <span className={styles.airport}>{flight.origin}</span>
        <Plane size={12} className={styles.routePlane} />
        <span className={styles.airport}>{flight.destination}</span>
      </div>

      <div className={styles.rowTimes}>
        <div className={styles.timeItem}>
          <span className={styles.timeLbl}>STD</span>
          <span className={styles.timeVal}>{fmtTime(flight.estStart)}</span>
        </div>
        <div className={styles.timeItem}>
          <span className={styles.timeLbl}>STA</span>
          <span className={styles.timeVal}>{fmtTime(flight.estEnd)}</span>
        </div>
        {flight.delayMinutes > 0 && (
          <div className={styles.timeItem}>
            <span className={styles.timeLbl}>Delay</span>
            <span className={styles.timeDelay}>+{flight.delayMinutes}m</span>
          </div>
        )}
      </div>

      <div className={styles.rowStatus}>
        <span className={`${styles.badge} ${styles[meta.cls]}`}>
          <Icon size={11} /> {meta.label}
        </span>
        {flight.paxCount > 0 && (
          <span className={styles.pax}>{flight.paxCount} pax</span>
        )}
      </div>
    </div>
  )
}

export default function StationView() {
  const { user } = useAuth()
  const airport  = user?.airport ?? 'CMN'

  const [tab,  setTab]  = useState('all')   // 'all' | 'dep' | 'arr' | 'next3h'
  const [date, setDate] = useState(todayStr)

  const results = useMemo(() => {
    let dep = ALL_FLIGHTS.filter(f => f.origin === airport)
    let arr = ALL_FLIGHTS.filter(f => f.destination === airport)

    if (date) {
      const d = new Date(date); d.setHours(0,  0,  0,   0)
      const e = new Date(date); e.setHours(23, 59, 59, 999)
      const inDay = f => new Date(f.estStart) >= d && new Date(f.estStart) <= e
      dep = dep.filter(inDay)
      arr = arr.filter(inDay)
    }

    const sort = arr => [...arr].sort((a, b) => new Date(a.estStart) - new Date(b.estStart))
    dep = sort(dep)
    arr = sort(arr)

    return { dep, arr }
  }, [airport, date])

  // ── Flights in the next 3 hours ───────────────────────────
  const next3hFlights = useMemo(() => {
    const now = new Date()
    const cap = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const allMovements = [
      ...results.dep.map(f => ({ ...f, _dir: 'DEP' })),
      ...results.arr.map(f => ({ ...f, _dir: 'ARR' })),
    ]
    return allMovements.filter(f => {
      const t = new Date(f.estStart)
      return t >= now && t <= cap
    }).sort((a, b) => new Date(a.estStart) - new Date(b.estStart))
  }, [results])

  const next3hCount = next3hFlights.length

  const shown = tab === 'dep'    ? results.dep
              : tab === 'arr'    ? results.arr
              : tab === 'next3h' ? next3hFlights
              : [...results.dep.map(f => ({ ...f, _dir: 'DEP' })),
                 ...results.arr.map(f => ({ ...f, _dir: 'ARR' }))]
                .sort((a, b) => new Date(a.estStart) - new Date(b.estStart))

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.airportBadge}>
            <MapPin size={16} />
            <span>{airport}</span>
          </div>
          <div>
            <h1 className={styles.pageTitle}>Station View</h1>
            <p className={styles.pageSub}>Arrivals &amp; Departures — {airport}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <label className={styles.dateGroup}>
            <span className={styles.dateLabel}>DATE</span>
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{results.dep.length}</span>
          <span className={styles.summaryLbl}>Departures</span>
        </div>
        <div className={styles.summarySep} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{results.arr.length}</span>
          <span className={styles.summaryLbl}>Arrivals</span>
        </div>
        <div className={styles.summarySep} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>
            {[...results.dep, ...results.arr].filter(f => f.status !== 'OnTime').length}
          </span>
          <span className={styles.summaryLbl}>Delayed</span>
        </div>
        <div className={styles.summarySep} />
        {/* Next 3 hours stat */}
        <div className={`${styles.summaryItem} ${styles.summaryNext3h}`}>
          <div className={styles.next3hRow}>
            <Timer size={14} className={styles.next3hIcon} />
            <span className={styles.summaryNum}>{next3hCount}</span>
          </div>
          <span className={styles.summaryLbl}>Next 3h</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          ['all',    'All Movements'],
          ['dep',    'Departures'],
          ['arr',    'Arrivals'],
          ['next3h', `Next 3h (${next3hCount})`],
        ].map(([v, l]) => (
          <button
            key={v}
            className={`${styles.tab} ${tab === v ? styles.tabActive : ''} ${v === 'next3h' ? styles.tabNext3h : ''}`}
            onClick={() => setTab(v)}
          >
            {v === 'next3h' && <Timer size={12} />}
            {l}
          </button>
        ))}
      </div>

      {/* Flight list */}
      <div className={styles.list}>
        {shown.length === 0 ? (
          <div className={styles.empty}>
            <Plane size={36} className={styles.emptyIcon} />
            <p>
              {tab === 'next3h'
                ? `No flights arriving or departing ${airport} in the next 3 hours.`
                : `No flights found for ${airport} on this date.`}
            </p>
          </div>
        ) : (
          shown.map(f => {
            const dir = tab === 'all'    ? (f._dir ?? (f.origin === airport ? 'DEP' : 'ARR'))
                      : tab === 'next3h' ? (f._dir ?? (f.origin === airport ? 'DEP' : 'ARR'))
                      : tab.toUpperCase()
            return (
              <FlightRow
                key={`${f.id}-${dir}`}
                flight={f}
                direction={dir}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
