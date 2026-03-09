import { useState, useEffect } from "react";
import { legs } from "../../data/flightsData";

/*
===========================================================
MAP LEG MODEL → UI FLIGHT STRUCTURE
===========================================================
Your Gantt timeline uses the Leg class.

We convert it into the structure used by the dashboard UI.
*/
function mapLegToFlight(l) {
    return {
        id: l.id,

        // Flight number
        fn_carrier: l.fn.slice(0, 2),
        fn_number: l.fn.slice(2),

        flight_type: l.service,

        destination: l.arr,
        provenance: l.dep,

        // Detect direction relative to CMN hub
        direction: l.dep === "CMN" ? "DEP" : "ARR",

        operational_day: l.date,

        aircraft_registration: l.reg,
        aircraft_subtype: l.subtype,

        scheduled_departure: l.depLocal,
        scheduled_arrival: l.arrLocal,

        block_time: "--",

        // OOOI data (not available in mock Leg yet)
        off_block: null,
        airborne: null,
        landing: null,
        on_block: null,

        delay_code_01: null,
        delay_time_01: l.delay,
        delay_code_02: null,
        delay_code_03: null,

        leg_state: l.state,
        leg_type: l.service,

        boarding_time: null,
        closing_time: null,

        fuel_status: l.fuel,
        catering_status: l.catering,
        cleaning_status: l.cleaning,
        loadsheet_status: l.loadsheet
    };
}

/*
===========================================================
CREATE FLIGHT DATASET FROM LEG OBJECTS
===========================================================
*/
const flights = legs.map(mapLegToFlight);


/*
===========================================================
DELAY CODES
===========================================================
*/
const delayCodes = {
    "15": "Embarquement tardif passagers",
    "71": "Technique avion — Maintenance",
    "89": "Météo — Conditions défavorables",
    "93": "Restrictions ATC",
};

/*
===========================================================
STATE CONFIGURATION
===========================================================
*/
const stateConfig = {
    Arrived: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Arrivé" },
    Airborne: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "En vol" },
    Boarding: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Embarquement" },
    Delayed: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Retardé" },
    Scheduled: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "Planifié" },
    Cancelled: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "Annulé" },
};

/*
===========================================================
SERVICE STATUS DOT COLOR
===========================================================
*/
const statusDot = (val) => {
    if (!val || val === "N/A" || val === "NS") return "#6b7280";
    if (val === "Plan") return "#f59e0b";
    return "#22c55e";
};


/*
===========================================================
MAIN APP
===========================================================
*/
export default function App() {

    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState("Tous");
    const [time, setTime] = useState(new Date());

    /*
    ===============================================
    LIVE CLOCK
    ===============================================
    */
    useEffect(() => {
        const tick = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);

    /*
    ===============================================
    FILTER STATES
    ===============================================
    */
    const states = [
        "Tous",
        "Scheduled",
        "Boarding",
        "Airborne",
        "Arrived",
        "Delayed",
        "Cancelled"
    ];

    const filtered =
        filter === "Tous"
            ? flights
            : flights.filter(f => f.leg_state === filter);


    /*
    ===============================================
    TABLE GRID LAYOUT
    ===============================================
    */
    const COLS = "90px 70px 150px 120px 140px 120px 80px 100px 100px";


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
                    <span style={{
                        fontSize: 25,
                        letterSpacing: 4,
                        color: "#fff"
                    }}>
                        ROYAL AIR MAROC
                    </span>

                    <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />

                    <span style={{
                        fontSize: 10,
                        letterSpacing: 2.5,
                        color: "rgba(255,255,255,0.65)"
                    }}>
                        Chef d'Escale
                    </span>
                </div>

                <div style={{ textAlign: "right" }}>
                    <div style={{
                        fontSize: 19,
                        fontWeight: 700
                    }}>
                        {time.toTimeString().slice(0, 8)}
                    </div>

                    <div style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.55)"
                    }}>
                        CMN · UTC+1
                    </div>
                </div>

            </div>


            <div style={{
                maxWidth: 1380,
                margin: "0 auto",
                padding: "28px 36px"
            }}>


                {/* FILTER BUTTONS */}

                <div style={{
                    display: "flex",
                    gap: 7,
                    marginBottom: 16,
                    flexWrap: "wrap"
                }}>

                    {states.map(s => {

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
                    {[
                        "Vol",
                        "Dir.",
                        "Route",
                        "Avion",
                        "Planifié",
                        "Réel OOOI",
                        "Retard",
                        "Statut",
                        "Services"
                    ].map(h => <span key={h}>{h}</span>)}
                </div>



                {/* FLIGHT ROWS */}

                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5
                }}>

                    {filtered.map(f => {

                        const state = stateConfig[f.leg_state] || stateConfig.Scheduled;

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

                                <div style={{
                                    fontWeight: 700,
                                    fontSize: 14
                                }}>
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
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 600
                                    }}>
                                        {f.direction === "DEP" ? f.destination : f.provenance}
                                    </div>

                                    <div style={{
                                        color: "#64748b",
                                        fontSize: 10
                                    }}>
                                        {f.flight_type}
                                    </div>
                                </div>


                                {/* Aircraft */}

                                <div>

                                    <div style={{
                                        fontSize: 11
                                    }}>
                                        {f.aircraft_registration}
                                    </div>

                                    <div style={{
                                        fontSize: 10,
                                        color: "#64748b"
                                    }}>
                                        {f.aircraft_subtype}
                                    </div>

                                </div>


                                {/* Schedule */}

                                <div>
                                    <div style={{
                                        fontSize: 12,
                                        fontFamily: "monospace"
                                    }}>
                                        {f.scheduled_departure} → {f.scheduled_arrival}
                                    </div>

                                    <div style={{
                                        fontSize: 10,
                                        color: "#64748b"
                                    }}>
                                        Block {f.block_time}
                                    </div>
                                </div>


                                {/* OOOI */}

                                <div style={{
                                    fontSize: 11,
                                    fontFamily: "monospace"
                                }}>
                                    {f.off_block || "--:--"} / {f.on_block || "--:--"}
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

                                <div style={{
                                    display: "flex",
                                    gap: 10
                                }}>

                                    {[
                                        ["F", f.fuel_status],
                                        ["C", f.catering_status],
                                        ["N", f.cleaning_status],
                                        ["L", f.loadsheet_status]
                                    ].map(([abbr, s]) => (

                                        <div key={abbr} style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center"
                                        }}>

                                            <div style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: "50%",
                                                background: statusDot(s)
                                            }} />

                                            <span style={{
                                                fontSize: 8,
                                                color: "#475569"
                                            }}>
                                                {abbr}
                                            </span>

                                        </div>

                                    ))}

                                </div>

                            </div>

                        );

                    })}

                </div>

            </div>

        </div>
    );
}