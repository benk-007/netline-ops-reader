import { useState, useEffect } from "react";

const mockFlights = [
    {
        id: "AT1001", fn_carrier: "AT", fn_number: "1001", flight_type: "Régulier",
        destination: "CDG", provenance: "CMN", direction: "DEP",
        operational_day: "2026-02-25", aircraft_registration: "CN-RGX", aircraft_subtype: "B737-800",
        scheduled_departure: "06:30", scheduled_arrival: "10:45", block_time: "04:15",
        off_block: "06:47", airborne: "07:02", landing: null, on_block: null,
        delay_code_01: "93", delay_time_01: 17, delay_code_02: null, delay_code_03: null,
        leg_state: "Airborne", leg_type: "Revenue",
        boarding_time: "06:05", closing_time: "06:20",
        fuel_status: "OK", catering_status: "OK", cleaning_status: "OK", loadsheet_status: "Signed",
    },
    {
        id: "AT204", fn_carrier: "AT", fn_number: "204", flight_type: "Régulier",
        destination: "CMN", provenance: "LHR", direction: "ARR",
        operational_day: "2026-02-25", aircraft_registration: "CN-RNM", aircraft_subtype: "B787-9",
        scheduled_departure: "07:00", scheduled_arrival: "11:20", block_time: "03:50",
        off_block: "07:00", airborne: "07:14", landing: "11:09", on_block: "11:22",
        delay_code_01: null, delay_time_01: 0, delay_code_02: null, delay_code_03: null,
        leg_state: "Arrived", leg_type: "Revenue",
        boarding_time: "06:30", closing_time: "06:45",
        fuel_status: "OK", catering_status: "OK", cleaning_status: "Done", loadsheet_status: "Signed",
    },
    {
        id: "AT568", fn_carrier: "AT", fn_number: "568", flight_type: "Régulier",
        destination: "JFK", provenance: "CMN", direction: "DEP",
        operational_day: "2026-02-25", aircraft_registration: "CN-ROB", aircraft_subtype: "B787-8",
        scheduled_departure: "09:15", scheduled_arrival: "15:30", block_time: "09:15",
        off_block: null, airborne: null, landing: null, on_block: null,
        delay_code_01: "71", delay_time_01: 35, delay_code_02: "15", delay_code_03: null,
        leg_state: "Delayed", leg_type: "Revenue",
        boarding_time: "09:50", closing_time: null,
        fuel_status: "In Progress", catering_status: "OK", cleaning_status: "OK", loadsheet_status: "Pending",
    },
    {
        id: "AT312", fn_carrier: "AT", fn_number: "312", flight_type: "Charter",
        destination: "AGA", provenance: "CMN", direction: "DEP",
        operational_day: "2026-02-25", aircraft_registration: "CN-RGA", aircraft_subtype: "B737-700",
        scheduled_departure: "10:00", scheduled_arrival: "11:05", block_time: "01:05",
        off_block: null, airborne: null, landing: null, on_block: null,
        delay_code_01: null, delay_time_01: 0, delay_code_02: null, delay_code_03: null,
        leg_state: "Boarding", leg_type: "Charter",
        boarding_time: "09:30", closing_time: "09:45",
        fuel_status: "OK", catering_status: "OK", cleaning_status: "OK", loadsheet_status: "Signed",
    },
    {
        id: "AT771", fn_carrier: "AT", fn_number: "771", flight_type: "Régulier",
        destination: "DXB", provenance: "CMN", direction: "DEP",
        operational_day: "2026-02-25", aircraft_registration: "CN-RNL", aircraft_subtype: "B787-9",
        scheduled_departure: "11:45", scheduled_arrival: "20:10", block_time: "07:25",
        off_block: null, airborne: null, landing: null, on_block: null,
        delay_code_01: null, delay_time_01: 0, delay_code_02: null, delay_code_03: null,
        leg_state: "Scheduled", leg_type: "Revenue",
        boarding_time: "11:20", closing_time: "11:35",
        fuel_status: "Planned", catering_status: "Planned", cleaning_status: "Planned", loadsheet_status: "Not Started",
    },
    {
        id: "AT099", fn_carrier: "AT", fn_number: "099", flight_type: "Ferry",
        destination: "RBA", provenance: "CMN", direction: "DEP",
        operational_day: "2026-02-25", aircraft_registration: "CN-RGT", aircraft_subtype: "ATR72-600",
        scheduled_departure: "12:30", scheduled_arrival: "13:00", block_time: "00:30",
        off_block: null, airborne: null, landing: null, on_block: null,
        delay_code_01: "89", delay_time_01: 50, delay_code_02: null, delay_code_03: null,
        leg_state: "Cancelled", leg_type: "Ferry",
        boarding_time: null, closing_time: null,
        fuel_status: "N/A", catering_status: "N/A", cleaning_status: "N/A", loadsheet_status: "N/A",
    },
];

const delayCodes = {
    "15": "Embarquement tardif passagers",
    "71": "Technique avion — Maintenance",
    "89": "Météo — Conditions défavorables",
    "93": "Restrictions ATC",
};

const kpis = {
    otp: 62, avg_delay: 25.5, turnaround_avg: "48 min",
    total_flights: 6, on_time: 2, delayed: 2, cancelled: 1,
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
                    {[["general", "Général"], ["horaires", "Horaires"], ["escale", "Escale"], ["retards", "Retards"]].map(([k, v]) => (
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

export default function SchedulePage({ isDark
}) {
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState("Tous");

    const t = themes[isDark ? "dark" : "light"];


    const states = ["Tous", "Scheduled", "Boarding", "Airborne", "Arrived", "Delayed", "Cancelled"];
    const filtered = filter === "Tous" ? mockFlights : mockFlights.filter(f => f.leg_state === filter);

    const COLS = "90px 70px 150px 120px 140px 120px 80px 100px 100px";

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

                {/* KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
                    {[
                        { label: "OTP", value: `${kpis.otp}%`, sub: "On Time Performance", warn: true },
                        { label: "Retard moyen", value: `${kpis.avg_delay} min`, sub: "Vols retardés", warn: true },
                        { label: "Rotation moy.", value: kpis.turnaround_avg, sub: "Temps de rotation avion", warn: false },
                        { label: "Vols du jour", value: kpis.total_flights, sub: `${kpis.on_time} à l'heure · ${kpis.delayed} retardés · ${kpis.cancelled} annulé`, warn: false },
                    ].map(({ label, value, sub, warn }) => (
                        <div key={label} style={{ background: t.kpiBg, border: `1px solid ${warn ? "rgba(200,16,46,0.22)" : t.border}`, borderRadius: 12, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: isDark ? "none" : "0 1px 8px rgba(0,0,0,0.05)", transition: "background 0.3s" }}>
                            {warn && <div style={{ position: "absolute", top: 0, right: 0, width: 3, height: "100%", background: "linear-gradient(180deg,#c8102e,transparent)" }} />}
                            <div style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
                            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 40, color: warn ? "#c8102e" : t.text, letterSpacing: 1, lineHeight: 1 }}>{value}</div>
                            <div style={{ color: t.textDim, fontSize: 10, marginTop: 6 }}>{sub}</div>
                        </div>
                    ))}
                </div>

                {/* OTP bar */}
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 22px", marginBottom: 22, display: "flex", alignItems: "center", gap: 18, boxShadow: isDark ? "none" : "0 1px 5px rgba(0,0,0,0.04)", transition: "background 0.3s" }}>
                    <span style={{ color: t.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>Performance OTP</span>
                    <div style={{ flex: 1, height: 5, background: t.otpTrack, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${kpis.otp}%`, height: "100%", background: "linear-gradient(90deg,#c8102e,#e8223a)", borderRadius: 3 }} />
                    </div>
                    <span style={{ color: t.text, fontSize: 12, fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap" }}>{kpis.otp}%</span>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
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
                            }}>{s === "Tous" ? `Tous (${mockFlights.length})` : s}</button>
                        );
                    })}
                </div>

                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "6px 18px", color: t.textDimmer, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>
                    {["Vol", "Dir.", "Route", "Avion", "Planifié", "Réel OOOI", "Retard", "Statut", "Services"].map(h => <span key={h}>{h}</span>)}
                </div>

                {/* Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {filtered.map(f => {
                        const state = stateConfig[f.leg_state] || stateConfig.Scheduled;
                        const isLive = f.leg_state === "Airborne" || f.leg_state === "Boarding";
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
                                <div>
                                    <span style={{ background: state.bg, color: state.color, border: `1px solid ${state.color}30`, borderRadius: 5, padding: "3px 9px", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        {isLive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: state.color, animation: "pulse 1.5s infinite", flexShrink: 0 }} />}
                                        {state.label}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    {[["F", f.fuel_status], ["C", f.catering_status], ["N", f.cleaning_status], ["L", f.loadsheet_status]].map(([abbr, s]) => (
                                        <div key={abbr} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusDot(s) }} />
                                            <span style={{ fontSize: 8, color: t.textDimmer, letterSpacing: 0.3 }}>{abbr}</span>
                                        </div>
                                    ))}
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