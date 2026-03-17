import { useState } from "react";
import { SERVICE_COLORS, STATE_COLORS } from "../../constants/ganttConstants";
import "./GanttBottomPanel.css";

const TABS = [
    { key: "vol",          label: "Vol"         },
    { key: "trajectoire",  label: "Trajectoire" },
];

/* ── IATA Delay Codes ────────────────────────────────────── */
const DELAY_CODES = {
    "00": "Approbation interne compagnie / défaut attributable",
    "01": "Passager – retard individuel",
    "02": "Passager – retard de groupe",
    "03": "Passager – recherche de bagages",
    "04": "Passager – sur-réservation (overbooking)",
    "05": "Passager – non-présentation (no-show)",
    "06": "Passager – connexion tardive",
    "09": "Passager – autres causes",
    "11": "Fret / courrier – documentation",
    "12": "Fret / courrier – retard de livraison",
    "13": "Fret / courrier – chargement tardif",
    "15": "Bagages – traitement / tri",
    "16": "Bagages – chargement tardif",
    "17": "Bagages – déchargement excessif",
    "18": "Bagages – bagages en excès",
    "19": "Bagages – autres causes",
    "21": "Avitaillement – carburant",
    "22": "Avitaillement – catering",
    "23": "Avitaillement – nettoyage cabine",
    "24": "Avitaillement – matériel de service",
    "25": "Avitaillement – chargement / déchargement",
    "26": "Avitaillement – équipements de cabine",
    "27": "Avitaillement – ULD / conteneurs",
    "29": "Avitaillement – autres causes",
    "31": "Aéronef – panne avant départ",
    "32": "Aéronef – panne en escale",
    "33": "Aéronef – maintenance programmée",
    "34": "Aéronef – maintenance non programmée",
    "35": "Aéronef – changement d'appareil",
    "36": "Aéronef – substitution d'appareil",
    "37": "Aéronef – inspection / vérification",
    "38": "Aéronef – réparation mineure",
    "39": "Aéronef – autres raisons techniques",
    "41": "Technique – défaut moteur",
    "42": "Technique – système avionique",
    "43": "Technique – train d'atterrissage",
    "44": "Technique – pneus",
    "45": "Technique – système hydraulique",
    "46": "Technique – système électrique",
    "47": "Technique – APU",
    "51": "Dommages – collision avec oiseau",
    "52": "Dommages – collision au sol",
    "55": "Dommages – FOD (corps étranger)",
    "61": "Opérations aériennes – plan de vol",
    "62": "Opérations aériennes – documentation équipage",
    "63": "Opérations aériennes – dégivrage",
    "64": "Opérations aériennes – restrictions opérationnelles",
    "65": "Opérations aériennes – déroutement",
    "66": "Opérations aériennes – escale technique",
    "67": "Opérations aériennes – briefing",
    "68": "Opérations aériennes – restrictions de masse",
    "69": "Opérations aériennes – autres raisons",
    "71": "Équipage – indisponibilité capitaine",
    "72": "Équipage – indisponibilité copilote",
    "73": "Équipage – indisponibilité PNC",
    "75": "Équipage – temps de service dépassé",
    "76": "Équipage – formation / contrôle",
    "77": "Équipage – connexion tardive",
    "81": "Météo – départ",
    "82": "Météo – destination",
    "83": "Météo – en route",
    "84": "Météo – dégivrage",
    "85": "Météo – neige / verglas piste",
    "86": "ATC – régulation CFMU / ATFM",
    "87": "ATC – restriction en route",
    "88": "ATC – restriction aéroport",
    "89": "ATC – slot / créneau",
    "91": "Aéroport – piste / taxiway fermé",
    "92": "Aéroport – porte / parking indisponible",
    "93": "Aéroport – congestion aéroport",
    "94": "Aéroport – services au sol indisponibles",
    "95": "Aéroport – sûreté / contrôle",
    "96": "Gouvernemental – immigration / douanes",
    "97": "Gouvernemental – restrictions sanitaires",
    "98": "Réactionnaire – retard vol précédent",
    "99": "Divers – autres raisons",
};

function getDelayDescription(code) {
    if (!code) return "Code inconnu";
    return DELAY_CODES[code] || `Code IATA ${code}`;
}

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

/* ── Delay severity helper ────────────────────────────────── */
function delaySeverity(min) {
    if (!min || min <= 0) return null;
    if (min <= 15) return { color: "#f59e0b", label: `+${min} min` };
    if (min <= 30) return { color: "#f97316", label: `+${min} min` };
    return { color: "#ef4444", label: `+${min} min ⚠` };
}

function delaySeverityColor(min) {
    if (!min || min <= 0) return "#22c55e";
    if (min <= 15) return "#f59e0b";
    if (min <= 30) return "#f97316";
    return "#ef4444";
}

/* ── Delay Code Row component ─────────────────────────────── */
function DelayCodeRow({ code, time }) {
    if (!code && !time) return null;
    const sevColor = delaySeverityColor(time);
    return (
        <div className="bp-delay-row">
            <div className="bp-delay-code-badge" style={{ background: `${sevColor}18`, color: sevColor, borderColor: `${sevColor}40` }}>
                {code || "??"}
            </div>
            <div className="bp-delay-desc">{getDelayDescription(code)}</div>
            <div className="bp-delay-time" style={{ color: sevColor }}>
                {time ? `+${time} min` : "—"}
            </div>
        </div>
    );
}

/* ── Vol Tab (redesigned) ──────────────────────────────────── */
function VolTab({ leg, sc }) {
    const hasDelay = leg.totalDelay > 0;
    const delayCodes = [
        { code: leg.DELAY_CODE_01, time: leg.DELAY_TIME_01 },
        { code: leg.DELAY_CODE_02, time: leg.DELAY_TIME_02 },
        { code: leg.DELAY_CODE_03, time: leg.DELAY_TIME_03 },
    ].filter(d => d.code || d.time);

    const totalSevColor = delaySeverityColor(leg.totalDelay);

    return (
        <div className="bp-vol-layout">
            {/* Left: Flight data grid */}
            <div className="bp-vol-data">
                <div className="bp-vol-grid">
                    {[
                        ["Vol",     leg.fn,      sc.bar],
                        ["Immat.",  leg.reg,     null],
                        ["Type",    leg.subtype,  null],
                        ["Service", leg.service,  sc.text],
                        ["Départ",  leg.dep,     null],
                        ["Arrivée", leg.arr,     null],
                        ["Statut",  leg.state,   STATE_COLORS[leg.state]],
                        ["Date",    leg.date,    null],
                    ].map(([k, v, color]) => (
                        <div key={k} className="bp-card-lg">
                            <div className="bp-card-label-lg">{k}</div>
                            <div className="bp-card-value-lg" style={{ color: color || undefined }}>
                                {v}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Delay section (only if delayed) */}
            {hasDelay && (
                <div className="bp-delay-section">
                    <div className="bp-delay-header">
                        <div className="bp-delay-header-label">RETARD TOTAL</div>
                        <div className="bp-delay-total" style={{ color: totalSevColor }}>
                            +{leg.totalDelay} <span className="bp-delay-total-unit">min</span>
                        </div>
                    </div>
                    <div className="bp-delay-divider" />
                    <div className="bp-delay-list">
                        {delayCodes.map((d, i) => (
                            <DelayCodeRow key={i} code={d.code} time={d.time} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
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
                {tab === "vol" && <VolTab leg={leg} sc={sc} />}

                {/* ── TRAJECTOIRE ── */}
                {tab === "trajectoire" && (
                    <TrajectoryTab leg={leg} sc={sc} />
                )}

            </div>
        </div>
    );
}
