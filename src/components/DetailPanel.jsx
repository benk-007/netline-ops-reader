import { X, Plane } from 'lucide-react'
import styles from './DetailPanel.module.css'

function fmt(date) {
  if (!date) return '--:--'
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

const STATUS_LABEL = {
  OnTime: 'On Time',
  MinorDelay: 'Minor Delay',
  CriticalDelay: 'Critical Delay',
}

const BADGE_CLASS = {
  OnTime: 'green',
  MinorDelay: 'orange',
  CriticalDelay: 'red',
}

export default function DetailPanel({ flight, onClose }) {
  if (!flight) return null

  const badgeClass = BADGE_CLASS[flight.status] || 'green'

  return (
    <div className={styles.panel}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Plane size={20} className={styles.planeIcon} />
            <div>
              <h2 className={styles.flightNo}>{flight.flightNumber}</h2>
              <p className={styles.route}>
                {flight.origin} → {flight.destination} · {flight.aircraft}
              </p>
            </div>
            <span className={`${styles.badge} ${styles[badgeClass]}`}>
              {STATUS_LABEL[flight.status]}
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {/* Scheduled OOOI */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <span className={styles.dotEst} /> Scheduled (OOOI)
            </h3>
            <table className={styles.table}>
              <tbody>
                <tr><td>Out (ETD)</td><td>{fmt(flight.estStart)}</td></tr>
                <tr><td>Off</td>     <td>{fmt(flight.offTime)}</td></tr>
                <tr><td>On</td>      <td>{fmt(flight.onTime)}</td></tr>
                <tr><td>In (ETA)</td><td>{fmt(flight.estEnd)}</td></tr>
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
                <tr><td>Out (ATD)</td><td>{fmt(flight.outTime)}</td></tr>
                <tr><td>Off</td>     <td>{fmt(flight.offTime)}</td></tr>
                <tr><td>On</td>      <td>{fmt(flight.onTime)}</td></tr>
                <tr><td>In (ATA)</td><td>{fmt(flight.actEnd)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Flight Info */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Flight Info</h3>
            <table className={styles.table}>
              <tbody>
                <tr><td>Aircraft</td>   <td>{flight.aircraft}</td></tr>
                <tr><td>Passengers</td> <td>{flight.paxCount} pax</td></tr>
                <tr>
                  <td>Delay</td>
                  <td>
                    {flight.delayMinutes > 0
                      ? `${flight.delayMinutes}m (${flight.delayCode})`
                      : '—'}
                  </td>
                </tr>
                <tr><td>Route</td> <td>{flight.route}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
