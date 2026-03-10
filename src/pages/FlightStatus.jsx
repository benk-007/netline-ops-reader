import { useState, useMemo } from 'react'
import { Search, Plane, AlertTriangle, CheckCircle, Activity, ChevronDown } from 'lucide-react'
import { generateMockData, SERVICE_COLOR, SERVICE_LABEL, ALL_AIRPORTS } from '../data/FlightData'
import styles from './FlightStatus.module.scss'

const { flights: ALL_FLIGHTS } = generateMockData()
const AIRPORTS = ['ALL', ...ALL_AIRPORTS]

// ── Airport full names ────────────────────────────────────
const AIRPORT_INFO = {
  CMN: { city: 'Casablanca',  name: 'Mohammed V' },
  ORY: { city: 'Paris',       name: 'Orly' },
  CDG: { city: 'Paris',       name: 'Charles de Gaulle' },
  LHR: { city: 'London',      name: 'Heathrow' },
  MAD: { city: 'Madrid',      name: 'Barajas' },
  BCN: { city: 'Barcelona',   name: 'El Prat' },
  IST: { city: 'Istanbul',    name: 'Istanbul Airport' },
  FCO: { city: 'Rome',        name: 'Fiumicino' },
  DXB: { city: 'Dubai',       name: 'International' },
  JFK: { city: 'New York',    name: 'JFK' },
  BRU: { city: 'Brussels',    name: 'Zaventem' },
  AMS: { city: 'Amsterdam',   name: 'Schiphol' },
  GVA: { city: 'Geneva',      name: 'International' },
  RAK: { city: 'Marrakech',   name: 'Menara' },
  AGA: { city: 'Agadir',      name: 'Al Massira' },
  FEZ: { city: 'Fez',         name: 'Saïss' },
  TNG: { city: 'Tangier',     name: 'Ibn Battouta' },
}

function fmtTime(date) {
  if (!date) return '--:--'
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_META = {
  OnTime:        { label: 'On Time',        cls: 'green',  Icon: CheckCircle  },
  MinorDelay:    { label: 'Minor Delay',    cls: 'orange', Icon: AlertTriangle },
  CriticalDelay: { label: 'Critical Delay', cls: 'red',    Icon: AlertTriangle },
}

// ── Flight progress (0→1) based on current time ───────────
function getProgress(estStart, estEnd) {
  const now   = Date.now()
  const start = new Date(estStart).getTime()
  const end   = new Date(estEnd).getTime()
  if (now <= start) return 0
  if (now >= end)   return 1
  return (now - start) / (end - start)
}

// ── Expanded detail section ───────────────────────────────
function FlightDetail({ flight }) {
  const svcLabel = SERVICE_LABEL[flight.serviceType] ?? flight.serviceType
  const delayed  = flight.delayMinutes > 0
  return (
    <div className={styles.detail}>
      <div className={styles.detailGrid}>
        <div className={styles.detailGroup}>
          <span className={styles.detailLabel}>Scheduled Dep.</span>
          <span className={styles.detailVal}>{fmtTime(flight.estStart)}</span>
        </div>
        <div className={styles.detailGroup}>
          <span className={styles.detailLabel}>Actual Dep.</span>
          <span className={`${styles.detailVal} ${delayed ? styles.detailDelayed : ''}`}>
            {fmtTime(flight.actStart)}
            {delayed && <span className={styles.detailDelta}> +{flight.delayMinutes}m</span>}
          </span>
        </div>
        <div className={styles.detailGroup}>
          <span className={styles.detailLabel}>Scheduled Arr.</span>
          <span className={styles.detailVal}>{fmtTime(flight.estEnd)}</span>
        </div>
        <div className={styles.detailGroup}>
          <span className={styles.detailLabel}>Actual Arr.</span>
          <span className={`${styles.detailVal} ${delayed ? styles.detailDelayed : ''}`}>
            {fmtTime(flight.actEnd)}
          </span>
        </div>
        <div className={styles.detailGroup}>
          <span className={styles.detailLabel}>Aircraft</span>
          <span className={styles.detailVal}>{flight.aircraft}</span>
        </div>
        <div className={styles.detailGroup}>
          <span className={styles.detailLabel}>Type</span>
          <span className={styles.detailVal}>{flight.aircraftType}</span>
        </div>
        <div className={styles.detailGroup}>
          <span className={styles.detailLabel}>Service</span>
          <span className={styles.detailVal}>{svcLabel}</span>
        </div>
        {flight.paxCount > 0 && (
          <div className={styles.detailGroup}>
            <span className={styles.detailLabel}>Passengers</span>
            <span className={styles.detailVal}>{flight.paxCount}</span>
          </div>
        )}
        {flight.delayCode && (
          <div className={styles.detailGroup}>
            <span className={styles.detailLabel}>Delay Code</span>
            <span className={`${styles.detailVal} ${styles.detailDelayed}`}>{flight.delayCode}</span>
          </div>
        )}
      </div>
      <div className={styles.oooi}>
        <div className={styles.oooiItem}>
          <span className={styles.oooiLabel}>OUT</span>
          <span className={styles.oooiVal}>{fmtTime(flight.outTime)}</span>
        </div>
        <div className={styles.oooiDash} />
        <div className={styles.oooiItem}>
          <span className={styles.oooiLabel}>OFF</span>
          <span className={styles.oooiVal}>{fmtTime(flight.offTime)}</span>
        </div>
        <div className={styles.oooiDash} />
        <div className={styles.oooiItem}>
          <span className={styles.oooiLabel}>ON</span>
          <span className={styles.oooiVal}>{fmtTime(flight.onTime)}</span>
        </div>
        <div className={styles.oooiDash} />
        <div className={styles.oooiItem}>
          <span className={styles.oooiLabel}>IN</span>
          <span className={styles.oooiVal}>{fmtTime(flight.inTime)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Flight Card ───────────────────────────────────────────
function FlightCard({ flight, expanded, onToggle }) {
  const meta     = STATUS_META[flight.status] || STATUS_META.OnTime
  const color    = SERVICE_COLOR[flight.serviceType] ?? '#607080'
  const { Icon } = meta
  const progress = getProgress(flight.estStart, flight.estEnd)
  const inFlight = progress > 0 && progress < 1

  const originInfo = AIRPORT_INFO[flight.origin]      ?? { city: flight.origin,      name: '' }
  const destInfo   = AIRPORT_INFO[flight.destination] ?? { city: flight.destination, name: '' }

  return (
    <div className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`} onClick={onToggle}>
      {/* Accent stripe */}
      <div className={styles.cardAccent} style={{ background: color }} />

      <div className={styles.cardBody}>
        {/* Top row: airline + flight no + status */}
        <div className={styles.cardTop}>
          <div className={styles.airlineBlock}>
            <span className={styles.airlineName}>Royal Air Maroc</span>
            <span className={styles.flightNo}>{flight.flightNumber}</span>
          </div>
          <div className={styles.topRight}>
            <span className={`${styles.badge} ${styles[meta.cls]}`}>
              <Icon size={11} /> {meta.label}
            </span>
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${expanded ? styles.chevronUp : ''}`}
            />
          </div>
        </div>

        {/* Route row */}
        <div className={styles.routeRow}>
          {/* Origin */}
          <div className={styles.endpoint}>
            <div className={styles.time}>{fmtTime(flight.estStart)}</div>
            <div className={styles.date}>{fmtDate(flight.estStart)}</div>
            <div className={styles.airportCode}>{flight.origin}</div>
            <div className={styles.airportName}>{originInfo.city}</div>
            <div className={styles.airportFull}>{originInfo.name}</div>
          </div>

          {/* Flight path graphic */}
          <div className={styles.pathWrap}>
            <div className={styles.pathLine}>
              <div className={styles.pathFilled} style={{ width: `${progress * 100}%` }} />
              <div
                className={`${styles.planeIcon} ${inFlight ? styles.planeInFlight : ''}`}
                style={{ left: `${progress * 100}%` }}
              >
                <Plane size={14} />
              </div>
            </div>
            {inFlight && <div className={styles.inFlightLabel}>En Route</div>}
          </div>

          {/* Destination */}
          <div className={`${styles.endpoint} ${styles.endpointRight}`}>
            <div className={styles.time}>{fmtTime(flight.estEnd)}</div>
            <div className={styles.date}>{fmtDate(flight.estEnd)}</div>
            <div className={styles.airportCode}>{flight.destination}</div>
            <div className={styles.airportName}>{destInfo.city}</div>
            <div className={styles.airportFull}>{destInfo.name}</div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div onClick={e => e.stopPropagation()}>
          <FlightDetail flight={flight} />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function FlightStatus() {
  const [tab,         setTab]         = useState('route')
  const [fromAirport, setFromAirport] = useState('CMN')
  const [toAirport,   setToAirport]   = useState('ALL')
  const [routeDate,   setRouteDate]   = useState(todayStr)
  const [airline,     setAirline]     = useState('AT')
  const [flightNo,    setFlightNo]    = useState('')
  const [flightDate,  setFlightDate]  = useState(todayStr)
  const [results,     setResults]     = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [expandedId,  setExpandedId]  = useState(null)

  async function doSearch() {
    setLoading(true)
    setExpandedId(null)
    await new Promise(r => setTimeout(r, 350))

    let out = ALL_FLIGHTS

    if (tab === 'route') {
      if (fromAirport !== 'ALL') out = out.filter(f => f.origin      === fromAirport)
      if (toAirport   !== 'ALL') out = out.filter(f => f.destination === toAirport)
      if (routeDate) {
        const d = new Date(routeDate); d.setHours(0,  0,  0,   0)
        const e = new Date(routeDate); e.setHours(23, 59, 59, 999)
        out = out.filter(f => new Date(f.estStart) >= d && new Date(f.estStart) <= e)
      }
    } else {
      const q = `${airline}${flightNo}`.toLowerCase()
      if (q.length > 2) out = out.filter(f => f.flightNumber.toLowerCase().includes(q))
      if (flightDate) {
        const d = new Date(flightDate); d.setHours(0,  0,  0,   0)
        const e = new Date(flightDate); e.setHours(23, 59, 59, 999)
        out = out.filter(f => new Date(f.estStart) >= d && new Date(f.estStart) <= e)
      }
    }

    setResults([...out].sort((a, b) => new Date(a.estStart) - new Date(b.estStart)))
    setLoading(false)
  }

  const stats = useMemo(() => {
    if (!results) return null
    return {
      total:   results.length,
      onTime:  results.filter(f => f.status === 'OnTime').length,
      delayed: results.filter(f => f.status !== 'OnTime').length,
    }
  }, [results])

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Activity size={20} className={styles.headerIcon} />
        <div>
          <h1 className={styles.pageTitle}>Flight Status</h1>
          <p className={styles.pageSub}>Search and monitor flight status across the Royal Air Maroc network</p>
        </div>
      </div>

      <div className={styles.container}>
        {/* Search card */}
        <div className={styles.searchCard}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'route' ? styles.tabActive : ''}`}
              onClick={() => { setTab('route'); setResults(null) }}
            >By Route</button>
            <button
              className={`${styles.tab} ${tab === 'flight' ? styles.tabActive : ''}`}
              onClick={() => { setTab('flight'); setResults(null) }}
            >By Flight Number</button>
          </div>

          {tab === 'route' && (
            <div className={styles.searchForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>From</label>
                <select className={styles.formInput} value={fromAirport} onChange={e => setFromAirport(e.target.value)}>
                  {AIRPORTS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Airports' : a}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>To</label>
                <select className={styles.formInput} value={toAirport} onChange={e => setToAirport(e.target.value)}>
                  {AIRPORTS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Airports' : a}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date</label>
                <input type="date" className={styles.formInput} value={routeDate} onChange={e => setRouteDate(e.target.value)} />
              </div>
              <button className={styles.searchBtn} onClick={doSearch} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : <><Search size={14} /> Search</>}
              </button>
            </div>
          )}

          {tab === 'flight' && (
            <div className={styles.searchForm}>
              <div className={styles.formGroup} style={{ maxWidth: '90px' }}>
                <label className={styles.formLabel}>Airline</label>
                <input className={styles.formInput} value={airline} maxLength={3} onChange={e => setAirline(e.target.value.toUpperCase())} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Flight No</label>
                <input className={styles.formInput} placeholder="e.g. 123" value={flightNo} onChange={e => setFlightNo(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date</label>
                <input type="date" className={styles.formInput} value={flightDate} onChange={e => setFlightDate(e.target.value)} />
              </div>
              <button className={styles.searchBtn} onClick={doSearch} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : <><Search size={14} /> Search</>}
              </button>
            </div>
          )}
        </div>

        {/* Stats strip */}
        {stats && (
          <div className={styles.summaryStrip}>
            <span className={styles.summaryTotal}>{stats.total} flights found</span>
            <div className={styles.summaryCounts}>
              <span className={styles.countGreen}><CheckCircle size={13} /> {stats.onTime} On Time</span>
              <span className={styles.countRed}><AlertTriangle size={13} /> {stats.delayed} Delayed</span>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className={styles.resultList}>
            {results.length === 0 ? (
              <div className={styles.empty}>
                <Plane size={40} className={styles.emptyIcon} />
                <p>No flights found matching your search criteria.</p>
              </div>
            ) : (
              results.map(f => (
                <FlightCard
                  key={f.id}
                  flight={f}
                  expanded={expandedId === f.id}
                  onToggle={() => toggleExpand(f.id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
