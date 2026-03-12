import { useState, useRef, useEffect } from "react";
import { legs as ALL_LEGS } from "../../data/flightsData";

/* ── Map Leg state → FlightCard statusType ──────────────── */
const STATE_TO_STATUS = {
    Airborne:  "active",
    Arrived:   "landed",
    Delayed:   "delayed",
    Cancelled: "cancelled",
    Scheduled: "scheduled",
    Boarding:  "scheduled",
};

/* ── City lookup for display labels ──────────────────────── */
const CITY_MAP = {
    CMN: "Casablanca", CDG: "Paris", LHR: "Londres", MAD: "Madrid",
    BCN: "Barcelone", DXB: "Dubaï", JFK: "New York", BRU: "Bruxelles",
    IST: "Istanbul", ALG: "Alger", TUN: "Tunis", CAI: "Le Caire",
    FRA: "Francfort", GVA: "Genève", FCO: "Rome", RAK: "Marrakech",
    AGA: "Agadir", OUD: "Oujda", FES: "Fès", RBA: "Rabat",
    TNG: "Tanger", DSS: "Dakar", DKR: "Dakar", LIS: "Lisbonne",
};

/* ── Compute block-time duration string ────────────────────*/
function computeDuration(depUtc, arrUtc) {
    if (!depUtc || !arrUtc) return "—";
    const [dh, dm] = depUtc.split(":").map(Number);
    const [ah, am] = arrUtc.split(":").map(Number);
    let mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

/* ── Convert Leg → FlightCard format ───────────────────────*/
function legToFlight(leg) {
    return {
        id:         leg.id,
        fn:         leg.fn,
        airline:    "Royal Air Maroc",
        airlineCode:"AT",
        statusType: STATE_TO_STATUS[leg.state] || "scheduled",
        dep:        leg.dep,
        arr:        leg.arr,
        depCity:    CITY_MAP[leg.dep] || leg.dep,
        arrCity:    CITY_MAP[leg.arr] || leg.arr,
        depAirport: `${CITY_MAP[leg.dep] || leg.dep} (${leg.dep})`,
        arrAirport: `${CITY_MAP[leg.arr] || leg.arr} (${leg.arr})`,
        depTime:    leg.depUtc,
        arrTime:    leg.arrUtc,
        depDate:    leg.date,
        arrDate:    leg.date,
        aircraft:   leg.subtype,
        duration:   computeDuration(leg.depUtc, leg.arrUtc),
        service:    leg.service,
        delay:      leg.delay,
        reg:        leg.reg,
    };
}

/* ─────────────────────────────────────────────
   STATIC REFERENCE DATA
───────────────────────────────────────────────*/
const AIRLINES = [
    { code: "AT", name: "Royal Air Maroc" },
    { code: "AF", name: "Air France" },
    { code: "IB", name: "Iberia" },
    { code: "BA", name: "British Airways" },
    { code: "LH", name: "Lufthansa" },
    { code: "TK", name: "Turkish Airlines" },
    { code: "EK", name: "Emirates" },
    { code: "QR", name: "Qatar Airways" },
    { code: "MS", name: "EgyptAir" },
    { code: "ET", name: "Ethiopian Airlines" },
    { code: "KQ", name: "Kenya Airways" },
];

const AIRPORTS = [
    { code: "CMN", city: "Casablanca", name: "Mohammed V", country: "Maroc" },
    { code: "RAK", city: "Marrakech", name: "Menara", country: "Maroc" },
    { code: "AGA", city: "Agadir", name: "Al Massira", country: "Maroc" },
    { code: "FEZ", city: "Fès", name: "Saïss", country: "Maroc" },
    { code: "TNG", city: "Tanger", name: "Ibn Battouta", country: "Maroc" },
    { code: "OUD", city: "Oujda", name: "Angads", country: "Maroc" },
    { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France" },
    { code: "ORY", city: "Paris", name: "Orly", country: "France" },
    { code: "MAD", city: "Madrid", name: "Adolfo Suárez", country: "Espagne" },
    { code: "LHR", city: "Londres", name: "Heathrow", country: "Royaume-Uni" },
    { code: "BCN", city: "Barcelone", name: "El Prat", country: "Espagne" },
    { code: "DXB", city: "Dubaï", name: "International", country: "EAU" },
    { code: "JFK", city: "New York", name: "John F. Kennedy", country: "États-Unis" },
    { code: "LBV", city: "Libreville", name: "Léon-Mba", country: "Gabon" },
    { code: "NBO", city: "Nairobi", name: "Jomo Kenyatta", country: "Kenya" },
    { code: "DKR", city: "Dakar", name: "Blaise Diagne", country: "Sénégal" },
    { code: "ABJ", city: "Abidjan", name: "Félix Houphouët-Boigny", country: "Côte d'Ivoire" },
];

/* MOCK_FLIGHTS removed — using real legs from flightsData.js */

const STATUS_STYLES = {
    scheduled: { bg: "#e8f5e9", color: "#2e7d32" },
    active: { bg: "#e3f2fd", color: "#1565c0" },
    landed: { bg: "#f3e5f5", color: "#6a1b9a" },
    delayed: { bg: "#fff3e0", color: "#e65100" },
    cancelled: { bg: "#ffebee", color: "#b71c1c" },
};
const STATUS_LABELS = {
    scheduled: "Prévu", active: "En vol", landed: "Atterri", delayed: "Retardé", cancelled: "Annulé",
};

const DAYS = [
    { label: "Dimanche", date: "8 Mars", key: "sun" },
    { label: "Lundi", date: "9 Mars", key: "mon" },
    { label: "Mardi", date: "10 Mars", key: "tue" },
];

/* ── Shared field shell ── */
function FieldShell({ label, children, focused, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                flex: 1, border: `1px solid ${focused ? "var(--filter-border-focus)" : "var(--filter-border)"}`,
                borderRadius: 8, padding: "8px 14px", background: "var(--filter-bg)",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: focused ? "0 0 0 2px rgba(59, 130, 246, 0.2)" : "none",
                minHeight: 52, boxSizing: "border-box", cursor: "pointer",
                position: "relative",
            }}
        >
            <div style={{ fontSize: 10, color: "var(--color-muted)", marginBottom: 3, fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3 }}>{label}</div>
            {children}
        </div>
    );
}

/* ── Generic dropdown ── */
function Dropdown({ label, value, onChange, items, renderSelected, renderItem, placeholder, searchPlaceholder }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const ref = useRef(null);

    const filtered = items.filter(i =>
        Object.values(i).some(v => String(v).toLowerCase().includes(query.toLowerCase()))
    );

    useEffect(() => {
        const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const selected = items.find(i => i.code === value);

    return (
        <div ref={ref} style={{ position: "relative", flex: 1 }}>
            <FieldShell label={label} focused={open} onClick={() => { setOpen(o => !o); setQuery(""); }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {selected ? renderSelected(selected) : (
                            <span style={{ fontSize: 13, color: "var(--ram-red)", fontFamily: "'DM Sans', sans-serif" }}>{placeholder}</span>
                        )}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: "var(--color-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0, marginLeft: 6 }}>
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </FieldShell>

            {open && (
                <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300,
                    background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--color-border)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflow: "hidden",
                }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border-2)" }}>
                        <input
                            autoFocus value={query} onChange={e => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            style={{
                                width: "100%", border: "1px solid var(--color-border)", borderRadius: 6,
                                padding: "6px 10px", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                                outline: "none", background: "var(--filter-bg)", color: "var(--color-text)", boxSizing: "border-box",
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                        {filtered.length === 0
                            ? <div style={{ padding: 16, textAlign: "center", color: "var(--color-muted)", fontSize: 12 }}>Aucun résultat</div>
                            : filtered.map(i => (
                                <div
                                    key={i.code}
                                    onClick={() => { onChange(i.code); setOpen(false); }}
                                    style={{
                                        padding: "10px 14px", cursor: "pointer",
                                        background: value === i.code ? "var(--bg-surface-3)" : "transparent", transition: "background 0.15s", color: "var(--color-text)",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-surface-2)"}
                                    onMouseLeave={e => e.currentTarget.style.background = value === i.code ? "var(--bg-surface-3)" : "transparent"}
                                >
                                    {renderItem(i)}
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Airport dropdown ── */
function AirportDropdown({ value, onChange, label }) {
    return (
        <Dropdown
            label={label}
            value={value}
            onChange={onChange}
            items={AIRPORTS}
            placeholder="Ville ou aéroport"
            searchPlaceholder="Rechercher un aéroport..."
            renderSelected={(a) => (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--color-text)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.city}, {a.country}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ram-red)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, flexShrink: 0 }}>{a.code}</span>
                </div>
            )}
            renderItem={(a) => (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)", fontFamily: "'DM Sans', sans-serif" }}>{a.city}</div>
                        <div style={{ fontSize: 11, color: "var(--color-muted)", fontFamily: "'DM Sans', sans-serif" }}>{a.name} · {a.country}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ram-red)", fontFamily: "'JetBrains Mono', monospace", marginLeft: 12 }}>{a.code}</span>
                </div>
            )}
        />
    );
}

/* ── Airline dropdown ── */
function AirlineDropdown({ value, onChange }) {
    return (
        <Dropdown
            label="Compagnie aérienne"
            value={value}
            onChange={onChange}
            items={AIRLINES}
            placeholder="Compagnie aérienne"
            searchPlaceholder="Rechercher..."
            renderSelected={(a) => (
                <span style={{ fontSize: 13, color: "var(--color-text)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{a.name}</span>
            )}
            renderItem={(a) => (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--color-text)", fontFamily: "'DM Sans', sans-serif" }}>{a.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ram-red)", fontFamily: "'JetBrains Mono', monospace" }}>{a.code}</span>
                </div>
            )}
        />
    );
}

/* ── Date field ── */
function DateField({ value, onChange }) {
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);

    const formatDisplay = (iso) => {
        if (!iso) return "";
        const d = new Date(iso + "T00:00:00");
        return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
    };

    return (
        <div style={{ position: "relative", flex: 1 }}>
            <FieldShell label="Dates" focused={focused} onClick={() => inputRef.current?.showPicker?.()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: value ? "var(--color-text)" : "var(--color-muted)", fontWeight: value ? 500 : 400 }}>
                        {value ? formatDisplay(value) : "jj/mm/aaaa"}
                    </span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </div>
                <input
                    ref={inputRef}
                    type="date"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{ position: "absolute", opacity: 0, top: 0, left: 0, width: "100%", height: "100%", cursor: "pointer" }}
                />
            </FieldShell>
        </div>
    );
}

/* ── Search button ── */
function SearchButton({ onClick, loading, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                padding: "0 28px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s",
                background: !disabled ? "linear-gradient(135deg, var(--ram-red) 0%, var(--ram-red-dark) 100%)" : "var(--bg-surface-3)",
                color: !disabled ? "#fff" : "var(--color-muted)", border: "none",
                fontFamily: "'DM Sans', sans-serif", alignSelf: "stretch",
                boxShadow: !disabled ? "0 4px 12px rgba(200,16,46,0.22)" : "none",
                minWidth: 110, minHeight: 52, flexShrink: 0,
            }}
        >
            {loading
                ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Recherche
                </div>
                : "Récupérer"
            }
        </button>
    );
}

/* ── Flight card ── */
function FlightCard({ flight }) {
    const status = STATUS_STYLES[flight.statusType] || STATUS_STYLES.scheduled;
    const label = STATUS_LABELS[flight.statusType] || "Prévu";
    const progress = flight.statusType === "active" ? 42 : flight.statusType === "landed" ? 100 : 0;

    return (
        <div
            style={{
                background: "var(--bg-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12,
                padding: "20px 24px", marginBottom: 10, transition: "box-shadow 0.2s, transform 0.2s",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: "var(--color-text)",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
        >
            <div style={{ display: "grid", gridTemplateColumns: "170px 1fr 130px", alignItems: "center", gap: 20 }}>

                {/* LEFT */}
                <div>
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 3 }}>{flight.airline}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5, lineHeight: 1 }}>{flight.fn}</div>
                    <div style={{ marginTop: 8 }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: status.bg, color: status.color, border: `1px solid ${status.color}33` }}>{label}</span>
                    </div>
                </div>

                {/* MIDDLE */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", fontFamily: "'JetBrains Mono', monospace" }}>{flight.depTime}</div>
                            <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{flight.depDate}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", fontFamily: "'JetBrains Mono', monospace" }}>{flight.arrTime}</div>
                            <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{flight.arrDate}</div>
                        </div>
                    </div>

                    {/* Progress track */}
                    <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
                        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "var(--color-border)" }} />
                        {progress > 0 && <div style={{ position: "absolute", left: 0, width: `${progress}%`, height: 2, background: "var(--ram-red)" }} />}
                        <div style={{ position: "absolute", left: `${Math.max(0, Math.min(95, progress))}%`, transform: "translateX(-50%)", zIndex: 2 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={flight.statusType === "active" ? "var(--ram-red)" : "#4caf50"} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}>
                                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                            </svg>
                        </div>
                        <div style={{ position: "absolute", left: 0, width: 8, height: 8, borderRadius: "50%", background: "var(--bg-surface-2)", border: "2px solid var(--color-border-focus)" }} />
                        <div style={{ position: "absolute", right: 0, width: 8, height: 8, borderRadius: "50%", background: "var(--bg-surface-2)", border: "2px solid var(--color-border-focus)" }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{flight.depCity}</div>
                            <div style={{ fontSize: 10, color: "var(--ram-red)", marginTop: 1 }}>{flight.depAirport}</div>
                        </div>
                        <div style={{ textAlign: "center", fontSize: 10, color: "var(--color-muted)", alignSelf: "center" }}>{flight.duration}</div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{flight.arrCity}</div>
                            <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 1 }}>{flight.arrAirport}</div>
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "var(--color-muted)", marginBottom: 4 }}>Appareil</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-2)", fontFamily: "'JetBrains Mono', monospace" }}>{flight.aircraft}</div>
                </div>
            </div>
        </div>
    );
}

/* ── MAIN ── */
export default function FlightSearch({ isDark }) {
    const [tab, setTab] = useState("route");

    // Route
    const [from, setFrom] = useState("LBV");
    const [to, setTo] = useState("");

    // Number
    const [airline, setAirline] = useState("");
    const [flightNum, setFlightNum] = useState("");
    const [date, setDate] = useState("2026-03-09");

    // Results
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedDay, setSelectedDay] = useState("mon");

    const canSearch = tab === "route"
        ? Boolean(from && to)
        : Boolean(flightNum.trim().length >= 2);

    const swap = () => { setFrom(to); setTo(from); };

    const handleSearch = () => {
        if (!canSearch) return;
        setLoading(true);
        setSearched(false);
        setTimeout(() => {
            let matched;
            if (tab === "route") {
                matched = ALL_LEGS.filter(l =>
                    (l.dep === from && l.arr === to) ||
                    (l.dep === to   && l.arr === from)
                );
            } else {
                matched = ALL_LEGS.filter(l =>
                    l.fn.toLowerCase().includes(flightNum.toLowerCase())
                );
            }
            // Sort by departure time, map to FlightCard format
            matched.sort((a, b) => a.depUtc.localeCompare(b.depUtc));
            setResults(matched.map(legToFlight));
            setLoading(false);
            setSearched(true);
        }, 500);
    };

    const handleTabChange = (t) => { setTab(t); setResults(null); setSearched(false); };

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "var(--bg-app)", padding: "32px 16px" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

            <div style={{ maxWidth: 920, margin: "0 auto" }}>

                {/* ── Search card ── */}
                <div style={{
                    background: "var(--bg-surface)", borderRadius: 16, padding: 24,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)", marginBottom: 20,
                    position: "relative", overflow: "visible", border: "1px solid var(--color-border)"
                }}>
                    {/* Decorative dots */}
                    <div style={{
                        position: "absolute", top: 0, right: 0, width: 200, height: 200,
                        backgroundImage: "radial-gradient(circle, #c8102e10 1px, transparent 1px)",
                        backgroundSize: "16px 16px", borderRadius: "0 16px 0 0", pointerEvents: "none",
                    }} />

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                        {[{ key: "route", label: "Itinéraire de vol" }, { key: "number", label: "Numéro de vol" }].map(t => (
                            <button
                                key={t.key}
                                onClick={() => handleTabChange(t.key)}
                                style={{
                                    padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                                    cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
                                    border: tab === t.key ? "1.5px solid var(--ram-red)" : "1.5px solid transparent",
                                    background: tab === t.key ? "var(--bg-surface-3)" : "transparent", color: tab === t.key ? "var(--ram-red)" : "var(--color-muted)",
                                }}
                            >{t.label}</button>
                        ))}
                    </div>

                    {/* ── ROUTE TAB ── */}
                    {tab === "route" && (
                        <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                            <AirportDropdown value={from} onChange={setFrom} label="De" />
                            <button
                                onClick={swap}
                                style={{
                                    width: 38, flexShrink: 0, background: "var(--bg-surface-2)", border: "1px solid var(--color-border)",
                                    borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center",
                                    justifyContent: "center", color: "var(--color-muted)", transition: "all 0.2s", alignSelf: "stretch",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ram-red)"; e.currentTarget.style.color = "var(--ram-red)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-muted)"; }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <AirportDropdown value={to} onChange={setTo} label="À" />
                            <SearchButton onClick={handleSearch} loading={loading} disabled={!canSearch} />
                        </div>
                    )}

                    {/* ── NUMBER TAB ── */}
                    {tab === "number" && (
                        <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                            {/* Airline */}
                            <AirlineDropdown value={airline} onChange={setAirline} />

                            {/* Flight number */}
                            <div style={{ flex: 1 }}>
                                <FieldShell label="Numéro de vol" focused={false}>
                                    <input
                                        value={flightNum}
                                        onChange={e => setFlightNum(e.target.value.toUpperCase())}
                                        placeholder="ex: AT788"
                                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                                        style={{
                                            border: "none", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                                            fontWeight: 600, color: "var(--color-text)", background: "transparent",
                                            width: "100%", padding: 0,
                                        }}
                                    />
                                </FieldShell>
                            </div>

                            {/* Date */}
                            <DateField value={date} onChange={setDate} />

                            <SearchButton onClick={handleSearch} loading={loading} disabled={!canSearch} />
                        </div>
                    )}
                </div>

                {/* ── Results ── */}
                {searched && results && (
                    <>
                        {/* Day tabs */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                            {DAYS.map(d => (
                                <div
                                    key={d.key}
                                    onClick={() => setSelectedDay(d.key)}
                                    style={{
                                        background: "var(--bg-surface-2)",
                                        border: selectedDay === d.key ? "2px solid var(--ram-red)" : "1px solid var(--color-border-2)",
                                        borderRadius: 10, padding: "14px 16px", textAlign: "center",
                                        cursor: "pointer", transition: "all 0.18s",
                                        boxShadow: selectedDay === d.key ? "0 2px 12px rgba(200,16,46,0.2)" : "none",
                                    }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 600, color: selectedDay === d.key ? "var(--ram-red)" : "var(--color-muted)", marginBottom: 2 }}>{d.label}</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: selectedDay === d.key ? "var(--color-text)" : "var(--color-text-2)" }}>{d.date}</div>
                                </div>
                            ))}
                        </div>

                        {/* Column headers */}
                        <div style={{ display: "grid", gridTemplateColumns: "170px 1fr 130px", padding: "6px 24px", gap: 20, marginBottom: 6 }}>
                            <div style={{ fontSize: 11, color: "var(--ram-red)", fontWeight: 600 }}>Numéro de vol/Statut</div>
                            <div style={{ fontSize: 11, color: "var(--ram-red)", fontWeight: 600 }}>Départ</div>
                            <div style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 600, textAlign: "right" }}>Arrivée</div>
                        </div>

                        {results.map(f => <FlightCard key={f.id} flight={f} />)}

                        {results.length === 0 && (
                            <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px dashed var(--color-border)" }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>✈️</div>
                                <div style={{ fontSize: 14, color: "var(--color-text)", fontWeight: 500 }}>Aucun vol trouvé</div>
                                <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>Essayez une autre date ou destination</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}