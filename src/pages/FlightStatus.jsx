import { useState, useMemo } from 'react'
import { Search, Plane, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { generateMockData, STATUS_COLOR } from '../data/FlightData'
import styles from './FlightStatus.module.css'

const { flights: ALL_FLIGHTS } = generateMockData()

// Unique airports from the data
const AIRPORTS = ['ALL', 'CMN', 'CDG', 'LHR', 'ORY', 'MAD', 'BCN', 'IST', 'FCO', 'DXB', 'JFK']

function fmtTime(date) {
  if (!date) return '--:--'
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_META = {
  OnTime: { label: 'On Time', cls: 'green', Icon: CheckCircle },
  MinorDelay: { label: 'Minor Delay', cls: 'orange', Icon: AlertTriangle },
  CriticalDelay: { label: 'Critical Delay', cls: 'red', Icon: AlertTriangle },
}

function FlightCard({ flight }) {
  const meta = STATUS_META[flight.status] || STATUS_META.OnTime
  const color = STATUS_COLOR[flight.status] || '#27AE60'
  const { Icon } = meta

  return (
    <div className={styles.card} style={{ '--accent': color }}>
      <div className={styles.cardAccent} />

      <div className={styles.cardMain}>
        {/* Route */}
        <div className={styles.routeBlock}>
          <div className={styles.routeAirport}>{flight.origin}</div>
          <div className={styles.routeArrow}>
            <span className={styles.routeLine} />
            <Plane size={13} className={styles.routePlane} />
            <span className={styles.routeLine} />
          </div>
          <div className={styles.routeAirport}>{flight.destination}</div>
        </div>

        {/* Times */}
        <div className={styles.timesBlock}>
          <div className={styles.timeCol}>
            <span className={styles.timeLabel}>ETD</span>
            <span className={styles.timeVal}>{fmtTime(flight.estStart)}</span>
          </div>
          <div className={styles.timeDivider} />
          <div className={styles.timeCol}>
            <span className={styles.timeLabel}>ETA</span>
            <span className={styles.timeVal}>{fmtTime(flight.estEnd)}</span>
          </div>
          {flight.delayMinutes > 0 && (
            <>
              <div className={styles.timeDivider} />
              <div className={styles.timeCol}>
                <span className={styles.timeLabel}>Delay</span>
                <span className={styles.timeDelay}>+{flight.delayMinutes}m</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.cardRight}>
        {/* Flight number */}
        <div className={styles.flightNo}>{flight.flightNumber}</div>
        <div className={styles.aircraftLbl}>{flight.aircraft.split(' ')[0]}</div>

        {/* Status badge */}
        <span className={`${styles.badge} ${styles[meta.cls]}`}>
          <Icon size={12} />
          {meta.label}
        </span>

        {/* Pax */}
        <div className={styles.pax}>{flight.paxCount} pax</div>
      </div>
    </div>
  )
}

export default function FlightStatus() {
  const [tab, setTab] = useState('route') // 'route' | 'flight'

  // Tab 1: Route
  const [fromAirport, setFromAirport] = useState('CMN')
  const [toAirport, setToAirport] = useState('ALL')
  const [routeDate, setRouteDate] = useState(todayStr)

  // Tab 2: Flight number
  const [airline, setAirline] = useState('AT')
  const [flightNo, setFlightNo] = useState('')
  const [flightDate, setFlightDate] = useState(todayStr)

  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  async function retrieve() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))

    let filtered = ALL_FLIGHTS

    if (tab === 'route') {
      if (fromAirport !== 'ALL') filtered = filtered.filter(f => f.origin === fromAirport)
      if (toAirport !== 'ALL') filtered = filtered.filter(f => f.destination === toAirport)
      if (routeDate) {
        const d = new Date(routeDate); d.setHours(0, 0, 0, 0)
        const e = new Date(routeDate); e.setHours(23, 59, 59, 999)
        filtered = filtered.filter(f => new Date(f.estStart) >= d && new Date(f.estStart) <= e)
      }
    } else {
      const q = `${airline}${flightNo}`.toLowerCase()
      if (q.length > 2) filtered = filtered.filter(f => f.flightNumber.toLowerCase().includes(q))
      if (flightDate) {
        const d = new Date(flightDate); d.setHours(0, 0, 0, 0)
        const e = new Date(flightDate); e.setHours(23, 59, 59, 999)
        filtered = filtered.filter(f => new Date(f.estStart) >= d && new Date(f.estStart) <= e)
      }
    }

    // Sort by departure time
    filtered = [...filtered].sort((a, b) => new Date(a.estStart) - new Date(b.estStart))
    setResults(filtered)
    setLoading(false)
  }

  const summaryStats = useMemo(() => {
    if (!results) return null
    const onTime = results.filter(f => f.status === 'OnTime').length
    const delayed = results.filter(f => f.status !== 'OnTime').length
    return { total: results.length, onTime, delayed }
  }, [results])

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Flight Status</h1>
          <p className={styles.pageSub}>Search and monitor flight status across the Royal Air Maroc network</p>
        </div>

        {/* Search card */}
        <div className={styles.searchCard}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'route' ? styles.tabActive : ''}`}
              onClick={() => { setTab('route'); setResults(null) }}
            >
              By Route — Itinéraire
            </button>
            <button
              className={`${styles.tab} ${tab === 'flight' ? styles.tabActive : ''}`}
              onClick={() => { setTab('flight'); setResults(null) }}
            >
              By Flight Number — Numéro de vol
            </button>
          </div>

          {/* Tab 1: Route */}
          {tab === 'route' && (
            <div className={styles.searchForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>From (Départ)</label>
                <select className={styles.formInput} value={fromAirport} onChange={e => setFromAirport(e.target.value)}>
                  {AIRPORTS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Airports' : a}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>To (Arrivée)</label>
                <select className={styles.formInput} value={toAirport} onChange={e => setToAirport(e.target.value)}>
                  {AIRPORTS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Airports' : a}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date</label>
                <input type="date" className={styles.formInput} value={routeDate} onChange={e => setRouteDate(e.target.value)} />
              </div>
              <button className={styles.retrieveBtn} onClick={retrieve} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : <><Search size={14} /> Récupérer</>}
              </button>
            </div>
          )}

          {/* Tab 2: Flight number */}
          {tab === 'flight' && (
            <div className={styles.searchForm}>
              <div className={styles.formGroup} style={{ maxWidth: '90px' }}>
                <label className={styles.formLabel}>Airline</label>
                <input className={styles.formInput} value={airline} maxLength={3} onChange={e => setAirline(e.target.value.toUpperCase())} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Flight No</label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. 123"
                  value={flightNo}
                  onChange={e => setFlightNo(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date</label>
                <input type="date" className={styles.formInput} value={flightDate} onChange={e => setFlightDate(e.target.value)} />
              </div>
              <button className={styles.retrieveBtn} onClick={retrieve} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : <><Search size={14} /> Récupérer</>}
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {summaryStats && (
          <>
            {/* Summary strip */}
            <div className={styles.summaryStrip}>
              <span className={styles.summaryTotal}>{summaryStats.total} flights found</span>
              <div className={styles.summaryCounts}>
                <span className={styles.countGreen}><CheckCircle size={13} /> {summaryStats.onTime} On Time</span>
                <span className={styles.countRed}><AlertTriangle size={13} /> {summaryStats.delayed} Delayed</span>
              </div>
            </div>

            {/* Flight cards list */}
            <div className={styles.resultList}>
              {results.length === 0 ? (
                <div className={styles.empty}>
                  <Plane size={40} className={styles.emptyIcon} />
                  <p>No flights found matching your search criteria.</p>
                </div>
              ) : (
                results.map(f => <FlightCard key={f.id} flight={f} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
