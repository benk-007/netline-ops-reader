/**
 * StationGanttPage — dedicated Gantt view for the chef_escale role.
 *
 * - Reads the current user's assignedAirports from meApi
 * - Fetches legs from the backend (station-scoped automatically server-side)
 * - Subscribes to SSE for live refresh
 * - Provides single-day navigation
 */
import { useState, useEffect, useCallback } from "react";
import { meApi, legsApi, subscribeToLegEvents } from "../../api";
import FlightGantt from "../Gantt/FlightGantt";
import GanttBottomPanel from "../BottomBar/GanttBottomPanel";
import { Leg } from "../../data/flightsData";

function dtoToLeg(dto) {
  const ft  = dto.flightTime      ?? {};
  const ac  = dto.aircraft        ?? {};
  const dep = dto.departureAirport ?? {};
  const arr = dto.arrivalAirport   ?? {};
  const delays = dto.delays        ?? [];
  const t = (iso) => iso ? iso.slice(11, 16) : null;
  return new Leg({
    LEG_NO:          dto.legNo,
    FN_CARRIER:      dto.carrierCode ?? "",
    FN_NUMBER:       dto.flightNumber?.slice((dto.carrierCode ?? "").length) ?? "",
    DAY_OF_ORIGIN:   dto.operationalDate,
    AC_SUBTYPE:      ac.subType      ?? "Unknown",
    AC_REGISTRATION: ac.registration ?? "N/A",
    DEP_AP_SCHED:    dep.iataCode    ?? "???",
    ARR_AP_SCHED:    arr.iataCode    ?? "???",
    LEG_STATE:       dto.legState    ?? "Scheduled",
    LEG_TYPE:        dto.legType     ?? "J",
    DEP_TIME_SCHED:  t(ft.std),
    ARR_TIME_SCHED:  t(ft.sta),
    OFF_BLOCK_TIME:  t(ft.offBlock),
    AIRBORNE_TIME:   t(ft.airborne),
    LANDING_TIME:    t(ft.landing),
    ON_BLOCK_TIME:   t(ft.onBlock),
    DELAY_CODE_01:   delays[0]?.code     ?? null,
    DELAY_TIME_01:   delays[0]?.duration ?? 0,
    DELAY_CODE_02:   delays[1]?.code     ?? null,
    DELAY_TIME_02:   delays[1]?.duration ?? 0,
    DELAY_CODE_03:   delays[2]?.code     ?? null,
    DELAY_TIME_03:   delays[2]?.duration ?? 0,
  });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(iso, offset) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StationGanttPage({ isDark }) {
  const [date, setDate]           = useState(todayISO);
  const [legs, setLegs]           = useState([]);
  const [airports, setAirports]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selectedLeg, setSelectedLeg] = useState(null);

  /* Fetch the current user's assignedAirports once on mount */
  useEffect(() => {
    meApi.get()
      .then(u => setAirports(u.assignedAirports ?? []))
      .catch(() => {});
  }, []);

  const fetchLegs = useCallback(async (d) => {
    setLoading(true);
    setError(null);
    try {
      const data = await legsApi.getByDate(d);
      setLegs(data.map(dtoToLeg));
    } catch (err) {
      setError("Failed to load legs: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLegs(date); }, [date, fetchLegs]);

  /* SSE — re-fetch on data change */
  useEffect(() => {
    const es = subscribeToLegEvents((evt) => {
      if (evt.hasChanges) fetchLegs(date);
    });
    return () => es.close();
  }, [date, fetchLegs]);

  const emptyFilters = { fDate: [], fService: [], fDep: [], fArr: [], fFlight: "", fSubtype: [], fReg: [] };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* ── Header bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "10px 18px",
        background: "var(--bg-surface, #0a1320)",
        borderBottom: "1px solid var(--border-color, #14243b)",
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text, #e2e8f0)", letterSpacing: 0.5 }}>
          Station Gantt
        </span>

        {airports.length > 0 && (
          <div style={{ display: "flex", gap: 5 }}>
            {airports.map(a => (
              <span key={a} style={{
                background: "rgba(200,16,46,0.14)", color: "#e05f72",
                border: "1px solid rgba(200,16,46,0.3)", borderRadius: 5,
                padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1,
              }}>
                {a}
              </span>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Day navigation */}
        <button
          onClick={() => setDate(d => shiftDate(d, -1))}
          style={{ background: "none", border: "1px solid var(--border-color, #14243b)", borderRadius: 6, color: "var(--color-dim, #64748b)", padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
        >‹</button>

        <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--color-text, #e2e8f0)", minWidth: 90, textAlign: "center" }}>
          {date}
        </span>

        <button
          onClick={() => setDate(d => shiftDate(d, 1))}
          style={{ background: "none", border: "1px solid var(--border-color, #14243b)", borderRadius: 6, color: "var(--color-dim, #64748b)", padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
        >›</button>

        <button
          onClick={() => setDate(todayISO())}
          style={{ background: "none", border: "1px solid var(--border-color, #14243b)", borderRadius: 6, color: "var(--color-dim, #64748b)", padding: "4px 8px", cursor: "pointer", fontSize: 11 }}
        >Today</button>

        <span style={{ fontSize: 11, color: "var(--color-dim, #64748b)", marginLeft: 8 }}>
          {loading ? "Loading…" : `${legs.length} leg${legs.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: "10px 18px", background: "rgba(239,68,68,0.1)", color: "#fca5a5", fontSize: 12, borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* ── Gantt ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <FlightGantt
          legs={legs}
          filters={emptyFilters}
          onSelectLeg={setSelectedLeg}
          dayCount={1}
          referenceDate={date}
        />
      </div>

      {/* ── Bottom panel ── */}
      <GanttBottomPanel leg={selectedLeg} onClose={() => setSelectedLeg(null)} isDark={isDark} />
    </div>
  );
}
