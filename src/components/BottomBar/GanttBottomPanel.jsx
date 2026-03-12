import { useState } from "react";
import { SERVICE_COLORS, STATE_COLORS } from "../../constants/ganttConstants";
import "./GanttBottomPanel.css";

const TABS = [
    { key: "vol",          label: "Vol"         },
    { key: "trajectoire",  label: "Trajectoire" },
];

/* ── Flight progress by state ─────────────────────────────── */
const STATE_PROGRESS = {
    Scheduled:  5,
    Delayed:    5,
    Boarding:   15,
    Airborne:   55,
    Arrived:    100,
    Cancelled:  0,
};

function getProgress(state) {
    return STATE_PROGRESS[state] ?? 5;
}

function isLiveState(state) {
    return state === "Airborne" || state === "Boarding";
}

/* ── Airplane SVG for the track ───────────────────────────── */
function PlaneIcon({ color }) {
    return (
        <svg width="18" height="18" viewBox="0 0 32 32" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}>
            <path d="M16 1 L19.5 13 L31 16 L19.5 19 L17.5 29 L16 25 L14.5 29 L12.5 19 L1 16 L12.5 13 Z" />
        </svg>
    );
}

/* ── Phase label for delay ────────────────────────────────── */
function delaySeverity(min) {
    if (!min || min <= 0) return null;
    if (min <= 15) return { color: "#f59e0b", label: `+${min} min` };
    if (min <= 30) return { color: "#f97316", label: `+${min} min` };
    return { color: "#ef4444", label: `+${min} min ⚠` };
}

/* ── OCC Trajectory component ─────────────────────────────── */
function TrajectoryTab({ leg, sc }) {
    const progress = getProgress(leg.state);
    const live = isLiveState(leg.state);
    const cancelled = leg.state === "Cancelled";
    const delay = delaySeverity(leg.delay);

    const trackColor = cancelled ? "var(--color-dim)" : sc.bar;
    const barWidth = `${progress}%`;

    // Phase labels
    const phases = [
        { label: "Pré-vol",   pct: 0,   active: progress < 15 },
        { label: "En vol",    pct: 40,  active: progress >= 15 && progress < 95 },
        { label: "Terminé",   pct: 85,  active: progress >= 95 },
    ];

    return (
        <div className="bp-traj-root">
            {/* Airport codes row */}
            <div className="bp-traj-airports">
                <div className="bp-traj-airport-block">
                    <div className="bp-traj-iata">{leg.dep}</div>
                    <div className="bp-traj-utc">{leg.depUtc}Z</div>
                    <div className="bp-traj-local">{leg.OFF_BLOCK_TIME ? `OFB ${leg.OFF_BLOCK_TIME}` : "—"}</div>
                </div>

                {/* Track */}
                <div className="bp-traj-track-wrap">
                    {/* Dashed background track */}
                    <div className="bp-traj-track-bg" />

                    {/* Filled progress bar */}
                    <div
                        className="bp-traj-track-fill"
                        style={{
                            width: barWidth,
                            background: cancelled
                                ? "var(--color-dim)"
                                : `linear-gradient(90deg, ${sc.bar}cc, ${sc.bar})`,
                        }}
                    />

                    {/* Airplane icon */}
                    {!cancelled && (
                        <div
                            className={`bp-traj-plane ${live ? "live" : ""}`}
                            style={{ left: `calc(${barWidth} - 9px)` }}
                        >
                            <PlaneIcon color={trackColor} />
                        </div>
                    )}

                    {/* Phase labels below track */}
                    <div className="bp-traj-phases">
                        {phases.map(ph => (
                            <div
                                key={ph.label}
                                className="bp-traj-phase"
                                style={{
                                    left: `${ph.pct}%`,
                                    color: ph.active ? sc.text : "var(--color-dim)",
                                    fontWeight: ph.active ? 700 : 400,
                                }}
                            >
                                {ph.active && <span className="bp-traj-phase-dot" style={{ background: ph.active ? sc.bar : "var(--color-dim)" }} />}
                                {ph.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bp-traj-airport-block" style={{ textAlign: "right" }}>
                    <div className="bp-traj-iata">{leg.arr}</div>
                    <div className="bp-traj-utc">{leg.arrUtc}Z</div>
                    <div className="bp-traj-local">{leg.ON_BLOCK_TIME ? `ONB ${leg.ON_BLOCK_TIME}` : "—"}</div>
                </div>
            </div>

            {/* Status + delay row */}
            <div className="bp-traj-status-row">
                <div
                    className={`bp-traj-state-chip ${live ? "pulse" : ""}`}
                    style={{
                        color: STATE_COLORS[leg.state] || "#808b99",
                        background: `${STATE_COLORS[leg.state] || "#808b99"}18`,
                        borderColor: `${STATE_COLORS[leg.state] || "#808b99"}40`,
                    }}
                >
                    {live && <span className="bp-traj-pulse-dot" style={{ background: STATE_COLORS[leg.state] }} />}
                    {leg.state}
                </div>

                {delay && (
                    <div className="bp-traj-delay-chip" style={{ color: delay.color, borderColor: `${delay.color}40`, background: `${delay.color}12` }}>
                        {delay.label}
                    </div>
                )}

                <div className="bp-traj-progress-label" style={{ color: sc.text }}>
                    {cancelled ? "Annulé" : `${progress}% parcouru`}
                </div>
            </div>

            {/* Timing grid */}
            <div className="bp-traj-timing">
                {[
                    ["Dép. prévu",  leg.DEP_TIME_SCHED || "—"],
                    ["Off Block",   leg.OFF_BLOCK_TIME || "—"],
                    ["Airborne",    leg.AIRBORNE_TIME  || "—"],
                    ["Landing",     leg.LANDING_TIME   || "—"],
                    ["On Block",    leg.ON_BLOCK_TIME  || "—"],
                    ["Arr. prévu",  leg.ARR_TIME_SCHED || "—"],
                ].map(([k, v]) => (
                    <div key={k} className="bp-traj-time-cell">
                        <div className="bp-traj-time-label">{k}</div>
                        <div className="bp-traj-time-val">{v}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Main component ───────────────────────────────────────── */
export default function GanttBottomPanel({ leg, onClose, isDark }) {
    const [tab, setTab] = useState("vol");
    if (!leg) return null;

    const sc = SERVICE_COLORS[leg.service] || SERVICE_COLORS.PAX;
    const stateColor = STATE_COLORS[leg.state] || "#808b99";

    return (
        <div className="bottom-panel" style={{ borderTopColor: sc.bar }}>
            {/* Drag handle */}
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
                        <div className="bp-airport-label">Départ</div>
                    </div>
                    <div className="bp-route-line">
                        <div className="bp-route-bar" style={{ background: `linear-gradient(90deg,${sc.bar},${sc.bar}55)` }} />
                        <div className="bp-route-service" style={{ color: sc.text }}>{leg.service}</div>
                    </div>
                    <div className="bp-airport-block">
                        <div className="bp-airport-code">{leg.arr}</div>
                        <div className="bp-airport-label">Arrivée</div>
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

                {/* ── VOL ── */}
                {tab === "vol" && (
                    <div className="bp-grid-6">
                        {[
                            ["Vol",        leg.fn],
                            ["Immat.",     leg.reg],
                            ["Type",       leg.subtype],
                            ["Service",    leg.service],
                            ["Départ",     leg.dep],
                            ["Arrivée",    leg.arr],
                            ["Retard",     leg.delay > 0 ? `+${leg.delay} min` : "—"],
                            ["Statut",     leg.state],
                            ["Date",       leg.date],
                        ].map(([k, v]) => (
                            <div key={k} className="bp-card">
                                <div className="bp-card-label">{k}</div>
                                <div
                                    className="bp-card-value"
                                    style={{ color: k === "Retard" && leg.delay > 0 ? "#ef4444" : undefined }}
                                >
                                    {v}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TRAJECTOIRE ── */}
                {tab === "trajectoire" && (
                    <TrajectoryTab leg={leg} sc={sc} />
                )}

            </div>
        </div>
    );
}
