import { useState, useEffect, useRef } from 'react'
import { X, Plane } from 'lucide-react'
import { SERVICE_COLOR, SERVICE_LABEL } from '../data/FlightData'
import styles from './FlightDetailOverlay.module.scss'

// ── Helpers ───────────────────────────────────────────────
function fmt(date) {
  if (!date) return '--:--'
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function fmtDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short',
  })
}

const STATUS_LABEL = {
  OnTime:       'On Time',
  MinorDelay:   'Minor Delay',
  CriticalDelay:'Critical Delay',
}

const STATUS_CLS = {
  OnTime:       'green',
  MinorDelay:   'orange',
  CriticalDelay:'red',
}

// ── Multi-stage progress calculation ─────────────────────
/**
 * Returns { stage, pct, stageIndex } based on current time vs OOOI times.
 * Stages (index):
 *   0 – Parked (pre-departure)
 *   1 – Push-back  (outTime → offTime)
 *   2 – Airborne   (offTime → onTime)
 *   3 – Taxi-in    (onTime → inTime)
 *   4 – Arrived
 */
function computeProgress(flight) {
  const now  = Date.now()
  const out  = new Date(flight.outTime).getTime()
  const off  = new Date(flight.offTime).getTime()
  const on   = new Date(flight.onTime).getTime()
  const inn  = new Date(flight.inTime).getTime()

  if (now < out) {
    return { stage: 'Parked — Pre-departure', stageIndex: 0, pct: 0 }
  }
  if (now >= inn) {
    return { stage: 'Arrived — At Gate', stageIndex: 4, pct: 100 }
  }
  if (now >= on) {
    const pct = Math.round(((now - on) / (inn - on)) * 25 + 75) // 75%–100%
    return { stage: 'Taxi-in', stageIndex: 3, pct }
  }
  if (now >= off) {
    const pct = Math.round(((now - off) / (on - off)) * 50 + 25) // 25%–75%
    return { stage: 'Airborne', stageIndex: 2, pct }
  }
  // between out and off (push-back / taxi-out)
  const pct = Math.round(((now - out) / (off - out)) * 25) // 0%–25%
  return { stage: 'Push-back / Taxi-out', stageIndex: 1, pct }
}

const STAGE_DOTS = ['Parked', 'Push-back', 'Airborne', 'Taxi-in', 'Arrived']

// ── Component ─────────────────────────────────────────────
export default function FlightDetailOverlay({ flight, onClose }) {
  const [progress, setProgress] = useState(() => computeProgress(flight))
  const timerRef = useRef(null)

  useEffect(() => {
    setProgress(computeProgress(flight))
    timerRef.current = setInterval(() => {
      setProgress(computeProgress(flight))
    }, 30_000)
    return () => clearInterval(timerRef.current)
  }, [flight])

  if (!flight) return null

  const color    = SERVICE_COLOR[flight.serviceType] ?? SERVICE_COLOR.default
  const badgeCls = STATUS_CLS[flight.status] ?? 'green'

  return (
    <div className={styles.overlay}>
      <div className={styles.inner}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Plane size={18} className={styles.planeIcon} style={{ color }} />
            <div>
              <h2 className={styles.flightNo}>{flight.flightNumber}</h2>
              <p className={styles.route}>
                {flight.origin} → {flight.destination}
                <span className={styles.sep}>·</span>
                {flight.aircraft}
                <span className={styles.sep}>·</span>
                {SERVICE_LABEL[flight.serviceType] ?? flight.serviceType}
              </p>
            </div>
            <span className={`${styles.badge} ${styles[badgeCls]}`}>
              {STATUS_LABEL[flight.status]}
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>

        {/* ── Progress Bar ── */}
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressStage}>{progress.stage}</span>
            <span className={styles.progressPct}>{progress.pct}%</span>
          </div>

          {/* Stage dots */}
          <div className={styles.stageTrack}>
            {STAGE_DOTS.map((s, i) => (
              <div
                key={s}
                className={`${styles.stageDot} ${i <= progress.stageIndex ? styles.stageDotActive : ''}`}
                title={s}
              >
                <span className={styles.stageDotLabel}>{s}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${progress.pct}%`, background: color }}
            />
            {/* Plane marker */}
            <div
              className={styles.planeMarker}
              style={{ left: `${Math.min(progress.pct, 97)}%`, color }}
            >
              <Plane size={14} />
            </div>
          </div>

          <div className={styles.barLabels}>
            <span>{fmt(flight.outTime)}</span>
            <span>{fmt(flight.offTime)}</span>
            <span>{fmt(flight.onTime)}</span>
            <span>{fmt(flight.inTime)}</span>
          </div>
        </div>

        {/* ── OOOI Grid ── */}
        <div className={styles.grid}>

          {/* Scheduled OOOI */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <span className={styles.dotEst} /> Scheduled (OOOI)
            </h3>
            <table className={styles.table}>
              <tbody>
                <tr><td>Out (STD)</td><td>{fmt(flight.estStart)}</td></tr>
                <tr><td>Off</td>      <td>{fmt(flight.offTime)}</td></tr>
                <tr><td>On</td>       <td>{fmt(flight.onTime)}</td></tr>
                <tr><td>In (STA)</td> <td>{fmt(flight.estEnd)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Actual OOOI */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <span className={styles.dotAct} /> Actual (OOOI)
            </h3>
            <table className={styles.table}>
              <tbody>
                <tr><td>Out (ATD)</td><td>{fmt(flight.actStart)}</td></tr>
                <tr><td>Off</td>      <td>{fmt(flight.offTime)}</td></tr>
                <tr><td>On</td>       <td>{fmt(flight.onTime)}</td></tr>
                <tr><td>In (ATA)</td> <td>{fmt(flight.actEnd)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Flight Info */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Flight Info</h3>
            <table className={styles.table}>
              <tbody>
                <tr><td>Aircraft</td>   <td>{flight.aircraft} ({flight.aircraftType})</td></tr>
                <tr><td>Passengers</td> <td>{flight.paxCount > 0 ? `${flight.paxCount} pax` : '—'}</td></tr>
                <tr>
                  <td>Delay</td>
                  <td>
                    {flight.delayMinutes > 0
                      ? `+${flight.delayMinutes}m (${flight.delayCode})`
                      : '—'}
                  </td>
                </tr>
                <tr><td>Service</td>    <td>{SERVICE_LABEL[flight.serviceType] ?? flight.serviceType}</td></tr>
                <tr><td>Date</td>       <td>{fmtDate(flight.estStart)}</td></tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}
