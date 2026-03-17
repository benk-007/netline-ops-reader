import "./FlightCard.css";
import { STATE_COLORS, getServiceColor } from "../../constants/ganttConstants";

export default function FlightCard({ leg }) {
  if (!leg) return null;
  const sc = getServiceColor(leg.service);
  const stateColor = STATE_COLORS[leg.state] || "#808b99";

  return (
    <div className="flight-card">

      {/* Accent bar */}
      <div className="fc-accent-bar" style={{ background: sc.bar }} />

      {/* Header: flight number + state */}
      <div className="fc-header">
        <div className="fc-flight-num" style={{ color: sc.bar }}>{leg.fn}</div>
        <span
          className="fc-state-badge"
          style={{ color: stateColor, background: `${stateColor}18`, borderColor: `${stateColor}40` }}
        >
          {leg.state}
        </span>
      </div>

      {/* Route */}
      <div className="fc-route">
        <div className="fc-airport">
          <div className="fc-iata">{leg.dep}</div>
          <div className="fc-time">{leg.depUtc}Z</div>
        </div>
        <div className="fc-route-mid">
          <div className="fc-route-line-wrap">
            <div className="fc-route-line" style={{ background: sc.bar }} />
            <div className="fc-plane-icon">✈</div>
          </div>
          <div className="fc-svc-badge" style={{ color: sc.text, background: sc.bg }}>
            {leg.service}
          </div>
        </div>
        <div className="fc-airport">
          <div className="fc-iata">{leg.arr}</div>
          <div className="fc-time">{leg.arrUtc}Z</div>
        </div>
      </div>

      {/* Divider */}
      <div className="fc-divider" />

      {/* Info grid */}
      <div className="fc-info-grid">
        <div className="fc-info-cell">
          <span className="fc-info-label">Immat</span>
          <span className="fc-info-value">{leg.reg}</span>
        </div>
        <div className="fc-info-cell">
          <span className="fc-info-label">Type</span>
          <span className="fc-info-value">{leg.subtype}</span>
        </div>
        <div className="fc-info-cell">
          <span className="fc-info-label">Retard</span>
          <span
            className="fc-info-value"
            style={{ color: leg.delay > 0 ? "#ef4444" : "#22c55e" }}
          >
            {leg.delay > 0 ? `+${leg.delay}min` : "—"}
          </span>
        </div>
        <div className="fc-info-cell">
          <span className="fc-info-label">Date</span>
          <span className="fc-info-value">{leg.date}</span>
        </div>
      </div>

      {/* Footer hint */}
      <div className="fc-footer-hint">Cliquer pour plus de détails</div>
    </div>
  );
}