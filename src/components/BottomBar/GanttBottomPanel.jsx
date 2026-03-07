import { useState } from "react";
import { SERVICE_COLORS, STATE_COLORS } from "../../constants/ganttConstants";
import "./GanttBottomPanel.css";
const TABS = [
    { key: "info", label: "Informations" },
    { key: "services", label: "Services" },
    { key: "timing", label: "Horaires" },
];

function StatusDot({ value }) {
    const color =
        !value || value === "N/A" || value === "NS" ? "#6b7280"
            : value === "Plan" || value === "WIP" || value === "Pending" || value === "Done" ? "#f59e0b"
                : "#22c55e";
    return <span className="srv-dot" style={{ background: color }} />;
}

export default function GanttBottomPanel({ leg, onClose }) {
    const [tab, setTab] = useState("info");
    if (!leg) return null;

    const sc = SERVICE_COLORS[leg.service] || SERVICE_COLORS.PAX;
    const stateColor = STATE_COLORS[leg.state] || "#808b99";

    return (
        <div className="bottom-panel" style={{ borderTopColor: sc.bar }}>
            {/* drag handle */}
            <div className="bp-handle-row">
                <div className="bp-handle" />
            </div>

            <div className="bp-content">
                {/* Identity */}
                <div className="bp-identity">
                    <div className="bp-flight-num" style={{ color: sc.bar }}>{leg.fn}</div>
                    <span
                        className="bp-state-badge"
                        style={{ color: stateColor, background: `${stateColor}18`, borderColor: `${stateColor}40` }}
                    >
                        {leg.state}
                    </span>
                    <div className="bp-sub">{leg.reg} · {leg.subtype} · {leg.service}</div>
                </div>

                {/* Route visual */}
                <div className="bp-route">
                    <div className="bp-airport-block">
                        <div className="bp-airport-code">{leg.dep}</div>
                        <div className="bp-airport-label">DÉPART</div>
                    </div>
                    <div className="bp-route-line">
                        <div className="bp-route-bar" style={{ background: `linear-gradient(90deg,${sc.bar},${sc.bar}66)` }} />
                        <div className="bp-route-service" style={{ color: sc.text }}>{leg.service}</div>
                    </div>
                    <div className="bp-airport-block">
                        <div className="bp-airport-code">{leg.arr}</div>
                        <div className="bp-airport-label">ARRIVÉE</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bp-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            className={`bp-tab ${tab === t.key ? "active" : ""}`}
                            style={{ borderBottomColor: tab === t.key ? sc.bar : "transparent" }}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Close */}
                <button className="bp-close" onClick={onClose}>×</button>
            </div>

            {/* Tab content */}
            <div className="bp-body">
                {tab === "info" && (
                    <div className="bp-grid-6">
                        {[
                            ["Numéro de vol", leg.fn],
                            ["Immatriculation", leg.reg],
                            ["Sous-type", leg.subtype],
                            ["Service", leg.service],
                            ["Départ", leg.dep],
                            ["Arrivée", leg.arr],
                            ["Retard", leg.delay > 0 ? `+${leg.delay} min` : "—"],
                            ["Statut", leg.state],
                            ["Date", leg.date],
                        ].map(([k, v]) => (
                            <div key={k} className="bp-card">
                                <div className="bp-card-label">{k}</div>
                                <div className="bp-card-value" style={{ color: k === "Retard" && leg.delay > 0 ? "#ef4444" : undefined }}>{v}</div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === "services" && (
                    <div className="bp-grid-4">
                        {[
                            ["Carburant", leg.fuel],
                            ["Catering", leg.catering],
                            ["Nettoyage", leg.cleaning],
                            ["Loadsheet", leg.loadsheet],
                        ].map(([k, v]) => (
                            <div key={k} className="bp-svc-card">
                                <div className="bp-card-label">{k}</div>
                                <div className="bp-svc-value">
                                    <StatusDot value={v} />
                                    <span>{v}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === "timing" && (
                    <div className="bp-grid-4">
                        {[
                            ["Départ UTC", `${leg.depUtc}Z`],
                            ["Arrivée UTC", `${leg.arrUtc}Z`],
                            ["Départ Local", leg.depLocal],
                            ["Arrivée Local", leg.arrLocal],
                            ["Code Retard ", leg.delay > 0 ? `+${leg.delay} min` : "—"],
                        ].map(([k, v]) => (
                            <div key={k} className="bp-time-card">
                                <div className="bp-card-label">{k}</div>
                                <div className="bp-time-value">{v}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
