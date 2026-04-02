import { useState, useMemo, useEffect } from "react";
import { meApi } from "../../api";

/* ── Normalize backend UPPERCASE states → PascalCase used by filters ── */
const STATE_NORM = {
    SCHEDULED: "Scheduled", BOARDING: "Boarding", AIRBORNE: "Airborne",
    LANDED:    "Arrived",   ARRIVED:  "Arrived",  DELAYED:  "Delayed",
    CANCELLED: "Cancelled",
    // pass-through for already-PascalCase values (mock data in flightsData.js)
    Scheduled: "Scheduled", Boarding: "Boarding", Airborne: "Airborne",
    Arrived:   "Arrived",   Delayed:  "Delayed",  Cancelled: "Cancelled",
};

/* ── Convert Leg objects to schedule-row format ── */
function legToScheduleRow(leg) {
    const depMins = timeToMins(leg.DEP_TIME_SCHED);
    const arrMins = timeToMins(leg.ARR_TIME_SCHED);
    let blockMins = arrMins - depMins;
    if (blockMins < 0) blockMins += 24 * 60;
    const bh = Math.floor(blockMins / 60);
    const bm = blockMins % 60;

    return {
        id:                    leg.LEG_NO,
        fn_carrier:            leg.FN_CARRIER,
        fn_number:             leg.FN_NUMBER,
        flight_type:           leg.LEG_TYPE === 'Charter' ? 'Charter' : leg.LEG_TYPE === 'Ferry' ? 'Ferry' : 'Régulier',
        destination:           leg.ARR_AP_SCHED,
        provenance:            leg.DEP_AP_SCHED,
        direction:             "DEP",
        operational_day:       leg.DAY_OF_ORIGIN,
        aircraft_registration: leg.AC_REGISTRATION,
        aircraft_subtype:      leg.AC_SUBTYPE,
        scheduled_departure:   leg.DEP_TIME_SCHED,
        scheduled_arrival:     leg.ARR_TIME_SCHED,
        block_time:            `${String(bh).padStart(2,'0')}:${String(bm).padStart(2,'0')}`,
        off_block:             leg.OFF_BLOCK_TIME || null,
        airborne:              leg.AIRBORNE_TIME || null,
        landing:               leg.LANDING_TIME || null,
        on_block:              leg.ON_BLOCK_TIME || null,
        delay_code_01:         leg.DELAY_CODE_01,
        delay_time_01:         leg.DELAY_TIME_01 || 0,
        delay_code_02:         leg.DELAY_CODE_02,
        delay_code_03:         leg.DELAY_CODE_03,
        leg_state:             STATE_NORM[leg.LEG_STATE] ?? "Scheduled",
        leg_type:              leg.LEG_TYPE,
        boarding_time:         null,
        closing_time:          null,
        fuel_status:           leg.LEG_STATE === 'Arrived' ? 'OK' : leg.LEG_STATE === 'Scheduled' ? 'Planned' : 'OK',
        catering_status:       leg.LEG_STATE === 'Arrived' ? 'OK' : leg.LEG_STATE === 'Scheduled' ? 'Planned' : 'OK',
        cleaning_status:       leg.LEG_STATE === 'Arrived' ? 'Done' : leg.LEG_STATE === 'Scheduled' ? 'Planned' : 'OK',
        loadsheet_status:      leg.LEG_STATE === 'Arrived' ? 'Signed' : leg.LEG_STATE === 'Scheduled' ? 'Not Started' : 'Pending',
    };
}

const delayCodes = {
    "11": "Retard avion précédent",
    "12": "Retard vol en correspondance",
    "13": "Équipement/programmation avion",
    "14": "Manque de personnel navigant commercial",
    "15": "Embarquement tardif passagers",
    "16": "Convenance commerciale / passagers",
    "17": "Erreur enregistrement",
    "18": "Retard bagage restitué",
    "19": "Passager en transit irrégulier",
    "21": "Documentation / informatique",
    "22": "Enregistrement tardif",
    "23": "Erreur d'enregistrement",
    "24": "Provisions cabine en excédent",
    "25": "Surclassement/déclassement passager",
    "26": "Passager malade",
    "27": "Passager débarqué tardivement",
    "28": "Passager débarqué / INAD / DEPO",
    "31": "Commande catering non reçue",
    "32": "Catering tardif",
    "33": "Erreur catering",
    "34": "Services de piste tardifs",
    "41": "Documentation avion en retard ou inexacte",
    "42": "Documentation masse/centrage tardive",
    "43": "Recalcul de la masse et du centrage",
    "44": "Ajustement de la charge",
    "45": "Déséquilibre de la charge",
    "46": "Sécurité — procédure de sûreté",
    "47": "Douanes/immigration",
    "51": "DCS — système de contrôle départ",
    "52": "Contrôle de charge / documentation",
    "55": "Réservation irrégulière",
    "56": "Surréservation",
    "57": "Coupons invalides",
    "61": "Bagages en soute tardifs",
    "62": "Courrier / fret tardif",
    "63": "Chargement avion tardif",
    "64": "Bagages en excédent",
    "68": "Transfert bagages retardé",
    "71": "Technique avion — Maintenance",
    "72": "Dommages avion",
    "73": "Services aéroportuaires techniques tardifs",
    "74": "Avion prévu indisponible",
    "75": "Maintenance programmée",
    "76": "Maintenance non programmée",
    "77": "Avion de remplacement",
    "81": "Dommages au sol",
    "82": "Dommages aéroportuaires",
    "83": "Restrictions aéroportuaires",
    "84": "Restrictions aéroport de départ",
    "85": "Équipements aéroportuaires",
    "86": "Restrictions en route / destination",
    "87": "Correspondances en attente — décision commerciale",
    "88": "Correspondances — avion de remplacement",
    "89": "Météo — Conditions défavorables",
    "91": "Indisponibilité porte / parking",
    "92": "Congestion aéroport",
    "93": "Restrictions ATC en route",
    "94": "Restrictions ATC départ / destination",
    "95": "Manque de personnel ATC",
    "96": "Panne équipement ATC",
    "97": "Restrictions gouvernementales",
    "98": "Restriction militaire",
    "99": "Autre cause",
};

const stateConfig = {
    Arrived: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Arrivé" },
    Airborne: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "En vol" },
    Boarding: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Embarquement" },
    Delayed: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Retardé" },
    Scheduled: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "Planifié" },
    Cancelled: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "Annulé" },
};

const statusDot = (val) => {
    if (!val || val === "N/A" || val === "Not Started") return "#6b7280";
    if (val === "Planned" || val === "In Progress" || val === "Pending") return "#f59e0b";
    return "#22c55e";
};

/* ── Weighted Operational Score (0–100): higher = more urgent/risky ── */
function computeWOS(f) {
    let score = 0;
    // Delay component (0–40 pts): 60 min of delay = full 40 pts
    const delay = f.delay_time_01 || 0;
    score += Math.min(40, Math.round((delay / 60) * 40));
    // State component
    const stateScores = { Delayed: 30, Boarding: 15, Scheduled: 10, Airborne: 5, Arrived: 0, Cancelled: 0 };
    score += stateScores[f.leg_state] ?? 10;
    // Multiple delay codes (+5 each)
    const numCodes = [f.delay_code_01, f.delay_code_02, f.delay_code_03].filter(Boolean).length;
    score += numCodes * 5;
    return Math.min(100, score);
}
function wosColor(s) {
    if (s >= 61) return "#ef4444";
    if (s >= 31) return "#f59e0b";
    return "#22c55e";
}
function wosLabel(s) {
    if (s >= 61) return "HIGH";
    if (s >= 31) return "MED";
    return "LOW";
}

const themes = {
    dark: {
        bg: "#03080d",
        surface: "#0a1320",
        surfaceHover: "#111e32",
        border: "#14243b",
        borderHover: "rgba(200,16,46,0.3)",
        text: "#e2e8f0",
        textMuted: "#94a3b8",
        textDim: "#64748b",
        textDimmer: "#475569",
        filterBorder: "#1e2d3d",
        filterText: "#64748b",
        kpiBg: "#0a1320",
        modalBg: "#0d1829",
        modalBorder: "#14243b",
        tabBorder: "#14243b",
        tabInactive: "#475569",
        cardBg: "#111e32",
        cardBorder: "#1a2a45",
        delayBg: "rgba(239,68,68,0.08)",
        delayCodeBg: "rgba(239,68,68,0.12)",
        otpTrack: "#1a2a45",
    },
    light: {
        bg: "#f8fafc",
        surface: "#ffffff",
        surfaceHover: "#f1f5f9",
        border: "#e2e8f0",
        borderHover: "rgba(200,16,46,0.25)",
        text: "#0f172a",
        textMuted: "#475569",
        textDim: "#94a3b8",
        textDimmer: "#cbd5e1",
        filterBorder: "#e2e8f0",
        filterText: "#94a3b8",
        kpiBg: "#ffffff",
        modalBg: "#ffffff",
        modalBorder: "#e2e8f0",
        tabBorder: "#e2e8f0",
        tabInactive: "#94a3b8",
        cardBg: "#f8fafc",
        cardBorder: "#e2e8f0",
        delayBg: "rgba(239,68,68,0.06)",
        delayCodeBg: "rgba(239,68,68,0.08)",
        otpTrack: "#e2e8f0",
    },
};

function Modal({ flight, onClose, t, isDark }) {
    const [tab, setTab] = useState("general");
    if (!flight) return null;
    const state = stateConfig[flight.leg_state] || stateConfig.Scheduled;
    const delayTotal = flight.delay_time_01 || 0;
    const delays = [flight.delay_code_01, flight.delay_code_02, flight.delay_code_03].filter(Boolean);

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: isDark ? "rgba(5,5,10,0.85)" : "rgba(10,5,10,0.45)",
                backdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "fadeIn 0.2s ease"
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: t.modalBg,
                    border: `1px solid ${t.modalBorder}`,
                    borderRadius: 20,
                    width: "min(780px, 96vw)",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: isDark
                        ? "0 0 80px rgba(180,20,30,0.15), 0 40px 80px rgba(0,0,0,0.7)"
                        : "0 0 60px rgba(200,16,46,0.07), 0 24px 60px rgba(0,0,0,0.15)",
                    animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)"
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: "28px 32px 20px", borderBottom: `1px solid ${t.tabBorder}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 38, color: "#c8102e", letterSpacing: 2, lineHeight: 1 }}>
                                {flight.fn_carrier}{flight.fn_number}
                            </span>
                            <span style={{ background: state.bg, color: state.color, border: `1px solid ${state.color}40`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace" }}>
                                {state.label}
                            </span>
                        </div>
                        <div style={{ color: t.textMuted, fontSize: 13 }}>
                            {flight.direction === "DEP" ? `${flight.provenance} → ${flight.destination}` : `${flight.destination} → ${flight.provenance}`}
                            &nbsp;&nbsp;·&nbsp;&nbsp;{flight.flight_type}
                            &nbsp;&nbsp;·&nbsp;&nbsp;{flight.aircraft_registration}
                            &nbsp;&nbsp;·&nbsp;&nbsp;{flight.aircraft_subtype}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", border: `1px solid ${t.cardBorder}`, borderRadius: 8, color: t.textMuted, width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", padding: "0 32px", borderBottom: `1px solid ${t.tabBorder}` }}>
                    {[["general", "Général"], ["horaires", "Horaires"], /* ["escale", "Escale"], */ ["retards", "Retards"]].map(([k, v]) => (
                        <button key={k} onClick={() => setTab(k)} style={{ background: "transparent", border: "none", borderBottom: tab === k ? "2px solid #c8102e" : "2px solid transparent", color: tab === k ? t.text : t.tabInactive, padding: "14px 20px", cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", transition: "all 0.2s" }}>
                            {v}
                        </button>
                    ))}
                </div>

                <div style={{ padding: "28px 32px" }}>
                    {tab === "general" && (
                        <div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                                {[
                                    ["Numéro de vol", `${flight.fn_carrier}${flight.fn_number}`],
                                    ["Type de vol", flight.flight_type],
                                    ["Type de leg", flight.leg_type],
                                    ["Direction", flight.direction === "DEP" ? "Départ" : "Arrivée"],
                                    ["Immatriculation", flight.aircraft_registration],
                                    ["Sous-type", flight.aircraft_subtype],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "16px 18px" }}>
                                        <div style={{ color: t.textDim, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{k}</div>
                                        <div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: isDark ? "rgba(200,16,46,0.06)" : "#fff5f6", border: `1px solid ${isDark ? "rgba(200,16,46,0.15)" : "rgba(200,16,46,0.1)"}`, borderRadius: 10, padding: "16px 20px" }}>
                                <div style={{ color: "#c8102e", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Journée opérationnelle</div>
                                <div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{flight.operational_day}</div>
                            </div>
                        </div>
                    )}

                    {tab === "horaires" && (
                        <div>
                            <div style={{ marginBottom: 28 }}>
                                <div style={{ color: t.textDim, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Séquence OOOI</div>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    {[["Off-Block", flight.off_block], ["Airborne", flight.airborne], ["Landing", flight.landing], ["On-Block", flight.on_block]].map(([label, time], i) => (
                                        <div key={label} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : 0 }}>
                                            <div style={{ textAlign: "center" }}>
                                                <div style={{ width: 40, height: 40, borderRadius: "50%", background: time ? "rgba(200,16,46,0.15)" : t.cardBg, border: `2px solid ${time ? "#c8102e" : t.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 11, color: time ? "#c8102e" : t.textDim, fontWeight: 700 }}>
                                                    {time ? "●" : "○"}
                                                </div>
                                                <div style={{ color: time ? t.text : t.textDim, fontSize: 13, fontWeight: 700 }}>{time || "--:--"}</div>
                                                <div style={{ color: t.textDim, fontSize: 10, letterSpacing: 1 }}>{label}</div>
                                            </div>
                                            {i < 3 && <div style={{ flex: 1, height: 2, background: time ? "rgba(200,16,46,0.3)" : t.cardBorder, margin: "0 8px" }} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                                {[
                                    ["Départ planifié", flight.scheduled_departure, false],
                                    ["Arrivée planifiée", flight.scheduled_arrival, false],
                                    ["Block time prévu", flight.block_time, false],
                                    ["Retard total", delayTotal ? `+${delayTotal} min` : "0 min", delayTotal > 0],
                                ].map(([k, v, warn]) => (
                                    <div key={k} style={{ background: warn ? t.delayBg : t.cardBg, border: `1px solid ${warn ? "rgba(239,68,68,0.2)" : t.cardBorder}`, borderRadius: 10, padding: "16px 18px" }}>
                                        <div style={{ color: warn ? "#ef4444" : t.textDim, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{k}</div>
                                        <div style={{ color: warn ? "#ef4444" : t.text, fontSize: 18, fontWeight: 700 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Escale tab — commented out for now
                    {tab === "escale" && (
                        <div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                                {[
                                    ["Heure d'embarquement", flight.boarding_time || "--:--"],
                                    ["Heure de clôture", flight.closing_time || "--:--"],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "18px 20px" }}>
                                        <div style={{ color: t.textDim, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{k}</div>
                                        <div style={{ color: t.text, fontSize: 24, fontWeight: 700, fontFamily: "monospace" }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ color: t.textDim, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Statuts opérationnels</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                {[["Carburant", flight.fuel_status], ["Catering", flight.catering_status], ["Nettoyage", flight.cleaning_status], ["Loadsheet", flight.loadsheet_status]].map(([k, v]) => (
                                    <div key={k} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ color: t.textMuted, fontSize: 13 }}>{k}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot(v) }} />
                                            <span style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{v}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    */}

                    {tab === "retards" && (
                        <div>
                            {delays.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "48px 0", color: "#22c55e", fontSize: 14 }}>
                                    <div style={{ fontSize: 36, marginBottom: 12, fontWeight: 800, fontFamily: "monospace" }}>0 min</div>
                                    Aucun retard enregistré — Vol à l'heure
                                </div>
                            ) : (
                                <div>
                                    <div style={{ background: t.delayBg, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: t.textMuted, fontSize: 13 }}>Retard total cumulé</span>
                                        <span style={{ color: "#ef4444", fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>+{delayTotal} min</span>
                                    </div>
                                    {delays.map((code, i) => (
                                        <div key={i} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "18px 20px", marginBottom: 12 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                <div style={{ background: t.delayCodeBg, color: "#ef4444", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>CODE {code}</div>
                                                {i === 0 && <span style={{ color: "#ef4444", fontWeight: 700 }}>+{flight.delay_time_01} min</span>}
                                            </div>
                                            <div style={{ color: t.text, fontSize: 14 }}>{delayCodes[code] || "Code non répertorié"}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Mock "current time" matches legs date: 2026-03-05T10:00 ── */
const NOW_H = 10;
const NOW_M = 0;
const WINDOW_H = 3;

function timeToMins(hhmm) {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    return h * 60 + m;
}

const STATE_COLORS_SCH = {
    Scheduled: { color: "#64748b", bg: "rgba(100,116,139,0.12)" },
    Boarding:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    Airborne:  { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
    Delayed:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    Arrived:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

export default function SchedulePage({ isDark, legs = [], currentUser = null }) {
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState("All");
    const [airportFilter, setAirportFilter] = useState("All");

    /* ── Station-manager scoping: chef_escale sees only their assigned airports ── */
    const isStation = currentUser?.role === "chef_escale";
    const [assignedAirports, setAssignedAirports] = useState([]);

    useEffect(() => {
        if (!isStation) return;
        meApi.get()
            .then(u => {
                const aps = u.assignedAirports ?? [];
                setAssignedAirports(aps);
                // Lock the airport filter to the first assigned airport if only one,
                // or keep "All" so they can switch between their own airports
                if (aps.length === 1) setAirportFilter(aps[0]);
            })
            .catch(() => {});
    }, [isStation]);

    const t = themes[isDark ? "dark" : "light"];

    /* ── Derive schedule rows from legs prop ── */
    const allFlights = useMemo(() => legs.map(legToScheduleRow), [legs]);

    /* chef_escale: restrict to legs that touch their assigned airports */
    const scheduleFlights = useMemo(() => {
        if (!isStation || assignedAirports.length === 0) return allFlights;
        return allFlights.filter(f =>
            assignedAirports.includes(f.provenance) || assignedAirports.includes(f.destination)
        );
    }, [allFlights, isStation, assignedAirports]);

    /* ── Next 3h banner data ── */
    const nowMins = NOW_H * 60 + NOW_M;
    const windowEnd = nowMins + WINDOW_H * 60;
    const legsNext3h = useMemo(() => legs.filter(l => {
        const dep = timeToMins(l.depUtc);
        return dep >= nowMins && dep <= windowEnd;
    }), [legs]);
    const next3hByState = useMemo(() => legsNext3h.reduce((acc, l) => {
        acc[l.state] = (acc[l.state] || 0) + 1;
        return acc;
    }, {}), [legsNext3h]);

    /* ── KPIs from real data ── */
    const computedKpis = useMemo(() => {
        const total     = scheduleFlights.length;
        const arrived   = scheduleFlights.filter(f => f.leg_state === 'Arrived').length;
        const airborne  = scheduleFlights.filter(f => f.leg_state === 'Airborne').length;
        const boarding  = scheduleFlights.filter(f => f.leg_state === 'Boarding').length;
        const scheduled = scheduleFlights.filter(f => f.leg_state === 'Scheduled').length;
        const cancelled = scheduleFlights.filter(f => f.leg_state === 'Cancelled').length;
        const delayed   = scheduleFlights.filter(f => f.leg_state === 'Delayed' || (f.delay_time_01 || 0) > 0).length;
        const onTime    = scheduleFlights.filter(f => f.leg_state === 'Arrived' && (f.delay_time_01 || 0) === 0).length;
        const delayedFlights = scheduleFlights.filter(f => (f.delay_time_01 || 0) > 0);
        const totalDelayMins = delayedFlights.reduce((s, f) => s + (f.delay_time_01 || 0), 0);
        const avgDelay = delayedFlights.length > 0
            ? Math.round((totalDelayMins / delayedFlights.length) * 10) / 10
            : 0;
        const otp = total > 0 ? Math.round(((total - delayed - cancelled) / total) * 100) : 0;
        const delayRate = total > 0 ? Math.round((delayed / total) * 100) : 0;
        return {
            otp, avg_delay: avgDelay, total_flights: total,
            on_time: onTime, delayed, cancelled, arrived, airborne, boarding, scheduled,
            totalDelayMins, delayRate,
        };
    }, [scheduleFlights]);

    /* ── Unique airports for the dropdown ── */
    const airports = useMemo(() => {
        if (isStation && assignedAirports.length > 0) {
            // station manager: only their assigned airports
            return ["All", ...assignedAirports.slice().sort()];
        }
        const set = new Set();
        scheduleFlights.forEach(f => { if (f.provenance) set.add(f.provenance); if (f.destination) set.add(f.destination); });
        return ["All", ...Array.from(set).sort()];
    }, [scheduleFlights, isStation, assignedAirports]);

    /* ── Top 5 airports by total delay impact — COO only ── */
    const topAirports = useMemo(() => {
        if (isStation) return [];
        const map = {};
        allFlights.forEach(f => {
            const delay = f.delay_time_01 || 0;
            if (delay <= 0 && f.leg_state !== "Delayed") return;
            [f.provenance, f.destination].filter(Boolean).forEach(ap => {
                if (!map[ap]) map[ap] = { airport: ap, totalDelay: 0, count: 0 };
                map[ap].totalDelay += delay;
                map[ap].count += 1;
            });
        });
        return Object.values(map).sort((a, b) => b.totalDelay - a.totalDelay).slice(0, 5);
    }, [allFlights, isStation]);

    const states = ["All", "Scheduled", "Boarding", "Airborne", "Arrived", "Delayed", "Cancelled"];
    const filtered = useMemo(() =>
        scheduleFlights
            .filter(f => filter === "All" || f.leg_state === filter)
            .filter(f => airportFilter === "All" || f.provenance === airportFilter || f.destination === airportFilter),
        [scheduleFlights, filter, airportFilter]
    );

    const COLS = "90px 70px 1fr 120px 140px 120px 80px 72px 100px";

    return (
        <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "background 0.3s, color 0.3s" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.35} }
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(200,16,46,0.25);border-radius:3px}
      `}</style>



            <div style={{ maxWidth: 1380, margin: "0 auto", padding: "28px 36px" }}>

                {/* ── Next 3h banner ── */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                    background: isDark ? "rgba(37,99,235,0.07)" : "#eff6ff",
                    border: `1px solid ${isDark ? "rgba(37,99,235,0.2)" : "#bfdbfe"}`,
                    borderRadius: 10, padding: "12px 20px", marginBottom: 18,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px #3b82f6", animation: "pulse 1.5s infinite" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#60a5fa" }}>
                            Prochains vols · {String(NOW_H).padStart(2,"0")}:{String(NOW_M).padStart(2,"0")} – {String(NOW_H + WINDOW_H).padStart(2,"0")}:00 UTC
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color: "#93c5fd" }}>
                            {legsNext3h.length}
                        </span>
                        <span style={{ fontSize: 11, color: t.textMuted }}>legs planifiés</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.entries(next3hByState).map(([state, count]) => {
                            const sc = STATE_COLORS_SCH[state] || { color: "#64748b", bg: "rgba(100,116,139,0.1)" };
                            return (
                                <span key={state} style={{
                                    padding: "2px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                                    letterSpacing: 0.5, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30`,
                                }}>
                                    {count} {state}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* ── KPI Dashboard Strip ── */}
                {isStation && assignedAirports.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: t.textDim }}>Vue station :</span>
                        {assignedAirports.map(a => (
                            <span key={a} style={{ background: "rgba(200,16,46,0.12)", color: "#e05f72", border: "1px solid rgba(200,16,46,0.3)", borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{a}</span>
                        ))}
                        <span style={{ fontSize: 10, color: t.textDim }}>— données filtrées à votre aéroport</span>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10, marginBottom: 10 }}>
                    {[
                        { label: "OTP",          value: `${computedKpis.otp}%`,            sub: "On Time Performance",  accent: "#c8102e",  bar: computedKpis.otp },
                        { label: "Retard moy.",  value: `${computedKpis.avg_delay}m`,       sub: `${computedKpis.delayed} vol(s) en retard`, accent: "#ef4444",  bar: null },
                        { label: "Total retard", value: `${computedKpis.totalDelayMins}m`,  sub: `Taux ${computedKpis.delayRate}%`,          accent: "#f59e0b",  bar: computedKpis.delayRate },
                        { label: "Vols du jour", value: computedKpis.total_flights,         sub: `${computedKpis.on_time} à l'heure`,        accent: t.text,     bar: null },
                        { label: "En vol",       value: computedKpis.airborne,              sub: `+ ${computedKpis.boarding} emb.`,          accent: "#3b82f6",  bar: null },
                        { label: "Arrivés",      value: computedKpis.arrived,               sub: `${computedKpis.scheduled} planifiés`,      accent: "#22c55e",  bar: null },
                        { label: "Annulés",      value: computedKpis.cancelled,             sub: "vols supprimés",                           accent: "#6b7280",  bar: null },
                    ].map(({ label, value, sub, accent, bar }) => (
                        <div key={label} style={{ background: t.kpiBg, border: `1px solid ${accent === "#c8102e" || accent === "#ef4444" ? "rgba(200,16,46,0.2)" : t.border}`, borderRadius: 10, padding: "14px 16px", position: "relative", overflow: "hidden", transition: "background 0.3s" }}>
                            <div style={{ color: t.textDim, fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, color: accent, letterSpacing: 1, lineHeight: 1 }}>{value}</div>
                            <div style={{ color: t.textDim, fontSize: 9, marginTop: 5 }}>{sub}</div>
                            {bar !== null && (
                                <div style={{ marginTop: 8, height: 3, background: t.otpTrack, borderRadius: 2, overflow: "hidden" }}>
                                    <div style={{ width: `${bar}%`, height: "100%", background: accent, borderRadius: 2 }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* OTP bar */}
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 18, transition: "background 0.3s" }}>
                    <span style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>OTP global</span>
                    <div style={{ flex: 1, height: 4, background: t.otpTrack, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${computedKpis.otp}%`, height: "100%", background: "linear-gradient(90deg,#c8102e,#e8223a)", borderRadius: 2 }} />
                    </div>
                    <span style={{ color: "#c8102e", fontSize: 13, fontWeight: 800, fontFamily: "monospace", whiteSpace: "nowrap" }}>{computedKpis.otp}%</span>
                    <span style={{ color: t.textDim, fontSize: 9, whiteSpace: "nowrap" }}>{computedKpis.on_time}/{computedKpis.total_flights} vols à l'heure</span>
                </div>

                {/* Top 5 Affected Airports — COO only */}
                {!isStation && topAirports.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                            Top 5 aéroports impactés par les retards
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            {topAirports.map((ap, i) => {
                                const isActive = airportFilter === ap.airport;
                                return (
                                    <button key={ap.airport} onClick={() => setAirportFilter(isActive ? "All" : ap.airport)} style={{
                                        background: isActive ? "rgba(239,68,68,0.12)" : (isDark ? "rgba(239,68,68,0.05)" : "#fff5f6"),
                                        border: `1px solid ${isActive ? "rgba(239,68,68,0.45)" : "rgba(239,68,68,0.15)"}`,
                                        borderRadius: 9, padding: "10px 16px", cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: 10, transition: "all 0.18s", textAlign: "left"
                                    }}>
                                        <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: "#ef4444", letterSpacing: 1, lineHeight: 1 }}>
                                            {i + 1}
                                        </span>
                                        <div>
                                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, color: isActive ? "#ef4444" : t.text }}>{ap.airport}</div>
                                            <div style={{ color: t.textDim, fontSize: 10 }}>{ap.count} vol{ap.count > 1 ? "s" : ""} · +{ap.totalDelay} min retard</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                    {states.map(s => {
                        const active = filter === s;
                        return (
                            <button key={s} onClick={() => setFilter(s)} style={{
                                background: active ? "rgba(200,16,46,0.14)" : "transparent",
                                border: `1px solid ${active ? "rgba(200,16,46,0.42)" : t.filterBorder}`,
                                borderRadius: 7, padding: "6px 14px",
                                color: active ? "#e05f72" : t.filterText,
                                fontSize: 10, fontWeight: 600, letterSpacing: 1,
                                textTransform: "uppercase", cursor: "pointer", transition: "all 0.18s"
                            }}>{s === "All" ? `All (${scheduleFlights.length})` : s}</button>
                        );
                    })}
                    <span style={{ width: 1, height: 20, background: t.filterBorder, margin: "0 4px" }} />
                    {/* Airport selector — disabled (locked) for station managers */}
                    {isStation ? (
                        <div style={{ display: "flex", gap: 5 }}>
                            {assignedAirports.map(a => (
                                <span key={a} style={{ background: "rgba(200,16,46,0.12)", color: "#e05f72", border: "1px solid rgba(200,16,46,0.3)", borderRadius: 7, padding: "6px 12px", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                                    {a}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <select
                            value={airportFilter}
                            onChange={e => setAirportFilter(e.target.value)}
                            style={{
                                background: airportFilter !== "All" ? "rgba(59,130,246,0.12)" : "transparent",
                                border: `1px solid ${airportFilter !== "All" ? "rgba(59,130,246,0.42)" : t.filterBorder}`,
                                borderRadius: 7, padding: "6px 12px",
                                color: airportFilter !== "All" ? "#60a5fa" : t.filterText,
                                fontSize: 10, fontWeight: 600, letterSpacing: 1,
                                textTransform: "uppercase", cursor: "pointer", outline: "none"
                            }}
                        >
                            {airports.map(ap => <option key={ap} value={ap}>{ap === "All" ? "Tous les aéroports" : ap}</option>)}
                        </select>
                    )}
                </div>

                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "6px 18px", color: t.textDimmer, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>
                    {["Vol", "Dir.", "Route", "Avion", "Scheduled", "Actual OOOI", "Delay", "WOS", "Status"].map(h => <span key={h}>{h}</span>)}
                </div>

                {/* Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {filtered.map(f => {
                        const state = stateConfig[f.leg_state] || stateConfig.Scheduled;
                        const isLive = f.leg_state === "Airborne" || f.leg_state === "Boarding";
                        const wos = computeWOS(f);
                        const wc = wosColor(wos);
                        return (
                            <div
                                key={f.id}
                                onClick={() => setSelected(f)}
                                onMouseEnter={e => { e.currentTarget.style.background = t.surfaceHover; e.currentTarget.style.borderColor = t.borderHover; }}
                                onMouseLeave={e => { e.currentTarget.style.background = t.surface; e.currentTarget.style.borderColor = t.border; }}
                                style={{
                                    display: "grid", gridTemplateColumns: COLS,
                                    padding: "14px 18px",
                                    background: t.surface,
                                    border: `1px solid ${t.border}`,
                                    borderRadius: 9, alignItems: "center",
                                    cursor: "pointer", transition: "all 0.16s ease",
                                    boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.04)"
                                }}
                            >
                                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, color: t.text }}>{f.fn_carrier}{f.fn_number}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: f.direction === "DEP" ? "#c8102e" : "#3b82f6" }}>{f.direction}</div>
                                <div>
                                    <div style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{f.direction === "DEP" ? f.destination : f.provenance}</div>
                                    <div style={{ color: t.textDim, fontSize: 10 }}>{f.flight_type}</div>
                                </div>
                                <div>
                                    <div style={{ color: t.textMuted, fontSize: 11 }}>{f.aircraft_registration}</div>
                                    <div style={{ color: t.textDim, fontSize: 10 }}>{f.aircraft_subtype}</div>
                                </div>
                                <div>
                                    <div style={{ color: t.textMuted, fontSize: 12, fontFamily: "monospace" }}>{f.scheduled_departure} → {f.scheduled_arrival}</div>
                                    <div style={{ color: t.textDim, fontSize: 10 }}>Block {f.block_time}</div>
                                </div>
                                <div style={{ color: t.textDim, fontSize: 11, fontFamily: "monospace" }}>{f.off_block || "--:--"} / {f.on_block || "--:--"}</div>
                                <div style={{ color: f.delay_time_01 > 0 ? "#ef4444" : "#22c55e", fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
                                    {f.delay_time_01 > 0 ? `+${f.delay_time_01}m` : "—"}
                                </div>
                                <div title={`Weighted Operational Score: ${wos}/100`}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 13, color: wc }}>{wos}</span>
                                        <div style={{ width: 40, height: 3, background: isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                            <div style={{ width: `${wos}%`, height: "100%", background: wc, borderRadius: 2 }} />
                                        </div>
                                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: wc }}>{wosLabel(wos)}</span>
                                    </div>
                                </div>
                                <div>
                                    <span style={{ background: state.bg, color: state.color, border: `1px solid ${state.color}30`, borderRadius: 5, padding: "3px 9px", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        {isLive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: state.color, animation: "pulse 1.5s infinite", flexShrink: 0 }} />}
                                        {state.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ color: t.textDimmer, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginRight: 6 }}>Services :</span>
                    <span style={{ color: t.textDimmer, fontSize: 9 }}>F=Fuel · C=Catering · N=Nettoyage · L=Loadsheet</span>
                    <span style={{ color: t.textDimmer, fontSize: 9, margin: "0 8px" }}>|</span>
                    {[["Conforme", "#22c55e"], ["En cours", "#f59e0b"], ["N/A", "#6b7280"]].map(([l, c]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
                            <span style={{ color: t.textDimmer, fontSize: 9 }}>{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            {selected && <Modal flight={selected} onClose={() => setSelected(null)} t={t} isDark={isDark} />}
        </div>
    );
}