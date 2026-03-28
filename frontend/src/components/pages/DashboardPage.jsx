import { useState, useEffect, useCallback } from "react";
import { legsApi, subscribeToLegEvents } from "../../api";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format a LocalDateTime ISO string ("2026-03-28T08:30:00") → "08:30". */
const fmtTime = (dt) => (dt ? dt.slice(11, 16) : null);

/** Today's date as ISO string "YYYY-MM-DD". */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Map a LegResponseDTO (backend JSON) to the UI flight structure used by this view.
 * Field names follow the existing display logic to avoid touching the JSX below.
 */
function mapDtoToFlight(leg) {
    const depCode = leg.departureAirport?.iataCode ?? "---";
    const arrCode = leg.arrivalAirport?.iataCode ?? "---";

    const firstDelay  = leg.delays?.[0];
    const secondDelay = leg.delays?.[1];
    const thirdDelay  = leg.delays?.[2];

    return {
        id:                    leg.legNo,
        fn_carrier:            leg.carrierCode ?? "",
        fn_number:             leg.flightNumber?.slice((leg.carrierCode ?? "").length) ?? "",
        flight_type:           leg.legType,
        destination:           arrCode,
        provenance:            depCode,
        // Direction relative to the CMN hub — departing from CMN = DEP, otherwise ARR
        direction:             depCode === "CMN" ? "DEP" : "ARR",
        operational_day:       leg.operationalDate,
        aircraft_registration: leg.aircraft?.registration ?? "—",
        aircraft_subtype:      leg.aircraft?.subType ?? "—",
        scheduled_departure:   fmtTime(leg.flightTime?.std),
        scheduled_arrival:     fmtTime(leg.flightTime?.sta),
        block_time:            "--",
        off_block:             fmtTime(leg.flightTime?.offBlock),
        airborne:              fmtTime(leg.flightTime?.airborne),
        landing:               fmtTime(leg.flightTime?.landing),
        on_block:              fmtTime(leg.flightTime?.onBlock),
        delay_code_01:         firstDelay?.code  ?? null,
        delay_time_01:         leg.delayDuration ?? 0,
        delay_code_02:         secondDelay?.code ?? null,
        delay_code_03:         thirdDelay?.code  ?? null,
        leg_state:             leg.legState,
        leg_type:              leg.legType,
        // Service statuses are not part of the MV model; shown as N/A
        fuel_status:           null,
        catering_status:       null,
        cleaning_status:       null,
        loadsheet_status:      null,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATE_CONFIG = {
    Arrived:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   label: "Arrivé" },
    Airborne:  { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "En vol" },
    Boarding:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "Embarquement" },
    Delayed:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   label: "Retardé" },
    Scheduled: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  label: "Planifié" },
    Cancelled: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "Annulé" },
};

const STATUS_DOT_COLOR = (val) => {
    if (!val || val === "N/A" || val === "NS") return "#6b7280";
    if (val === "Plan") return "#f59e0b";
    return "#22c55e";
};

const COLS = "90px 70px 150px 120px 140px 120px 80px 100px 100px";

const FILTER_STATES = ["Tous", "Scheduled", "Boarding", "Airborne", "Arrived", "Delayed", "Cancelled"];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {

    const [flights,    setFlights]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [selected,   setSelected]   = useState(null);
    const [filter,     setFilter]     = useState("Tous");
    const [time,       setTime]       = useState(new Date());
    const [lastUpdate, setLastUpdate] = useState(null);

    // ── Live clock ──────────────────────────────────────────────────────────
    useEffect(() => {
        const tick = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);

    // ── Backend fetch ───────────────────────────────────────────────────────
    const fetchLegs = useCallback(async () => {
        try {
            const data = await legsApi.getByDate(today());
            setFlights(data.map(mapDtoToFlight));
            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchLegs();
    }, [fetchLegs]);

    // ── SSE — re-fetch whenever the backend MV data changes ────────────────
    useEffect(() => {
        const es = subscribeToLegEvents(
            (event) => {
                if (event.hasChanges) {
                    fetchLegs();
                }
            }
        );
        return () => es.close();
    }, [fetchLegs]);

    // ── Filtered view ───────────────────────────────────────────────────────
    const filtered = filter === "Tous"
        ? flights
        : flights.filter(f => f.leg_state === filter);

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: "100vh",
            background: "#080508",
            color: "#f1f5f9",
            fontFamily: "'DM Sans', system-ui, sans-serif"
        }}>

            {/* TOPBAR */}
            <div style={{
                background: "linear-gradient(90deg,#c8102e,#9b0c22)",
                padding: "0 36px",
                height: 54,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <span style={{ fontSize: 25, letterSpacing: 4, color: "#fff" }}>
                        ROYAL AIR MAROC
                    </span>
                    <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
                    <span style={{ fontSize: 10, letterSpacing: 2.5, color: "rgba(255,255,255,0.65)" }}>
                        Chef d'Escale
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    {/* Live update indicator */}
                    {lastUpdate && (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1 }}>
                            MàJ {lastUpdate.toTimeString().slice(0, 8)}
                        </span>
                    )}
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 19, fontWeight: 700 }}>
                            {time.toTimeString().slice(0, 8)}
                        </div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>
                            CMN · UTC+1
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1380, margin: "0 auto", padding: "28px 36px" }}>

                {/* ERROR BANNER */}
                {error && (
                    <div style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 8,
                        padding: "10px 16px",
                        marginBottom: 16,
                        color: "#ef4444",
                        fontSize: 12
                    }}>
                        Erreur de chargement : {error}
                    </div>
                )}

                {/* FILTER BUTTONS */}
                <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
                    {FILTER_STATES.map(s => {
                        const active = filter === s;
                        return (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                style={{
                                    background: active ? "rgba(200,16,46,0.14)" : "transparent",
                                    border: `1px solid ${active ? "rgba(200,16,46,0.42)" : "rgba(255,255,255,0.08)"}`,
                                    borderRadius: 7,
                                    padding: "6px 14px",
                                    color: active ? "#e05f72" : "#64748b",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    letterSpacing: 1,
                                    cursor: "pointer"
                                }}
                            >
                                {s === "Tous" ? `Tous (${flights.length})` : s}
                            </button>
                        );
                    })}
                </div>

                {/* LOADING STATE */}
                {loading ? (
                    <div style={{ color: "#475569", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
                        Chargement des vols…
                    </div>
                ) : (
                    <>
                        {/* TABLE HEADER */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: COLS,
                            padding: "6px 18px",
                            color: "#334155",
                            fontSize: 9,
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                            fontWeight: 700
                        }}>
                            {["Vol", "Dir.", "Route", "Avion", "Planifié", "Réel OOOI", "Retard", "Statut", "Services"]
                                .map(h => <span key={h}>{h}</span>)}
                        </div>

                        {/* FLIGHT ROWS */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {filtered.map(f => {
                                const state = STATE_CONFIG[f.leg_state] || STATE_CONFIG.Scheduled;
                                return (
                                    <div
                                        key={f.id}
                                        onClick={() => setSelected(f)}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: COLS,
                                            padding: "14px 18px",
                                            background: "rgba(255,255,255,0.025)",
                                            border: "1px solid rgba(255,255,255,0.055)",
                                            borderRadius: 9,
                                            alignItems: "center",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {/* Flight number */}
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                                            {f.fn_carrier}{f.fn_number}
                                        </div>

                                        {/* Direction */}
                                        <div style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            letterSpacing: 1.5,
                                            color: f.direction === "DEP" ? "#c8102e" : "#3b82f6"
                                        }}>
                                            {f.direction}
                                        </div>

                                        {/* Route */}
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                                                {f.direction === "DEP" ? f.destination : f.provenance}
                                            </div>
                                            <div style={{ color: "#64748b", fontSize: 10 }}>
                                                {f.flight_type}
                                            </div>
                                        </div>

                                        {/* Aircraft */}
                                        <div>
                                            <div style={{ fontSize: 11 }}>{f.aircraft_registration}</div>
                                            <div style={{ fontSize: 10, color: "#64748b" }}>{f.aircraft_subtype}</div>
                                        </div>

                                        {/* Schedule */}
                                        <div>
                                            <div style={{ fontSize: 12, fontFamily: "monospace" }}>
                                                {f.scheduled_departure ?? "--:--"} → {f.scheduled_arrival ?? "--:--"}
                                            </div>
                                            <div style={{ fontSize: 10, color: "#64748b" }}>
                                                Block {f.block_time}
                                            </div>
                                        </div>

                                        {/* OOOI */}
                                        <div style={{ fontSize: 11, fontFamily: "monospace" }}>
                                            {f.off_block ?? "--:--"} / {f.on_block ?? "--:--"}
                                        </div>

                                        {/* Delay */}
                                        <div style={{
                                            color: f.delay_time_01 > 0 ? "#ef4444" : "#22c55e",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            fontFamily: "monospace"
                                        }}>
                                            {f.delay_time_01 > 0 ? `+${f.delay_time_01}m` : "—"}
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <span style={{
                                                background: state.bg,
                                                color: state.color,
                                                border: `1px solid ${state.color}30`,
                                                borderRadius: 5,
                                                padding: "3px 9px",
                                                fontSize: 9,
                                                fontWeight: 700
                                            }}>
                                                {state.label}
                                            </span>
                                        </div>

                                        {/* Services */}
                                        <div style={{ display: "flex", gap: 10 }}>
                                            {[["F", f.fuel_status], ["C", f.catering_status],
                                              ["N", f.cleaning_status], ["L", f.loadsheet_status]
                                            ].map(([abbr, s]) => (
                                                <div key={abbr} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                    <div style={{
                                                        width: 7,
                                                        height: 7,
                                                        borderRadius: "50%",
                                                        background: STATUS_DOT_COLOR(s)
                                                    }} />
                                                    <span style={{ fontSize: 8, color: "#475569" }}>{abbr}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {filtered.length === 0 && !loading && (
                                <div style={{ color: "#475569", fontSize: 13, padding: "24px 18px" }}>
                                    Aucun vol {filter !== "Tous" ? `avec statut "${filter}"` : ""} aujourd'hui.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
