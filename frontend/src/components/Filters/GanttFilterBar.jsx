import { useMemo, useState, useEffect } from "react";
import { SERVICE_COLORS, SUBTYPE_OPTIONS } from "../../constants/ganttConstants";
import SearchableSelect from "./SearchableSelect";
import "./GanttFilterBar.css";

function CalendarIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ProfilesIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GanttIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="4" rx="1" /><rect x="10" y="9" width="11" height="4" rx="1" /><rect x="5" y="15" width="14" height="4" rx="1" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

export default function GanttFilterBar({
  filters,
  onChange,
  dayCount = 1,
  onDayCountChange,
  onShiftDays,
  onResetToToday,
  onOpenProfiles,
  onOpenExport,
  legs = [],
  viewMode = "gantt",
  onViewChange,
}) {
  /* ── Pending (local) filter state — only applied on "Appliquer" click ── */
  const [pending, setPending] = useState(filters);

  // Sync pending when parent filters change (e.g. profile load, clear from outside)
  useEffect(() => {
    setPending(filters);
  }, [filters]);

  const { fDate, fService, fDep, fArr, fFlight, fSubtype, fReg } = pending;

  function changePending(update) {
    setPending(prev => ({ ...prev, ...update }));
  }

  function handleApply() {
    onChange(pending);
  }

  function clearAll() {
    const empty = { fDate: [], fService: [], fDep: [], fArr: [], fFlight: "", fSubtype: [], fReg: [] };
    setPending(empty);
    onChange(empty);
  }

  // Detect unapplied changes
  const hasPendingChanges = JSON.stringify(pending) !== JSON.stringify(filters);

  // Build dynamic option lists from current legs data
  const allDeps     = useMemo(() => ["All", ...[...new Set(legs.map(l => l.dep).filter(Boolean))].sort()], [legs]);
  const allArrs     = useMemo(() => ["All", ...[...new Set(legs.map(l => l.arr).filter(Boolean))].sort()], [legs]);
  const allServices = useMemo(() => ["All", ...Object.keys(SERVICE_COLORS)], []);
  const allDates    = useMemo(() => ["All", ...[...new Set(legs.map(l => l.date).filter(Boolean))].sort()], [legs]);
  const allSubtypes = useMemo(() => ["All", ...SUBTYPE_OPTIONS.filter(t => t !== "Tous types" && t !== "All")], []);
  const allRegs     = useMemo(() => ["All", ...[...new Set(legs.map(l => l.reg).filter(Boolean))].sort()], [legs]);

  const toArr = v => Array.isArray(v) ? v : [];
  const activeCount = [
    toArr(fDate).length > 0,
    toArr(fService).length > 0,
    toArr(fDep).length > 0,
    toArr(fArr).length > 0,
    fFlight !== "",
    toArr(fSubtype).length > 0,
    toArr(fReg).length > 0,
  ].filter(Boolean).length;

  return (
    <div className="filter-bar">

      {/* View switcher */}
      <div className="view-switcher">
        <button
          className={`view-switch-btn ${viewMode === "gantt" ? "view-switch-btn--active" : ""}`}
          onClick={() => onViewChange && onViewChange("gantt")}
          title="Gantt view"
        >
          <GanttIcon />
          <span>Gantt</span>
        </button>
        <button
          className={`view-switch-btn ${viewMode === "board" ? "view-switch-btn--active" : ""}`}
          onClick={() => onViewChange && onViewChange("board")}
          title="Table view"
        >
          <BoardIcon />
          <span>Board</span>
        </button>
      </div>

      <div className="filter-sep" />

      {/* ── Date ── */}
      <div className="filter-chip" data-type="date">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Date
        </span>
        <SearchableSelect
          options={allDates}
          value={toArr(fDate)}
          onChange={v => changePending({ fDate: v })}
          placeholder="Search date..."
          multi
        />
      </div>

      <div className="filter-sep" />

      {/* ── DEP ── */}
      <div className="filter-chip" data-type="dep">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Departure
        </span>
        <SearchableSelect
          options={allDeps}
          value={toArr(fDep)}
          onChange={v => changePending({ fDep: v })}
          placeholder="Search airport..."
          multi
        />
      </div>

      {/* ── ARR ── */}
      <div className="filter-chip" data-type="arr">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Arrival
        </span>
        <SearchableSelect
          options={allArrs}
          value={toArr(fArr)}
          onChange={v => changePending({ fArr: v })}
          placeholder="Search airport..."
          multi
        />
      </div> 

      <div className="filter-sep" />

      {/* ── Service ── */}
      <div className="filter-chip" data-type="service">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Service
        </span>
        <SearchableSelect
          options={allServices}
          value={toArr(fService)}
          onChange={v => changePending({ fService: v })}
          placeholder="Search service..."
          multi
        />
      </div>

      {/* ── Subtype ── */}
      <div className="filter-chip" data-type="type">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Aircraft Type
        </span>
        <SearchableSelect
          options={allSubtypes}
          value={toArr(fSubtype)}
          onChange={v => changePending({ fSubtype: v })}
          placeholder="Search type..."
          multi
        />
      </div>

      {/* ── Registration ── */}
      <div className="filter-chip" data-type="reg">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Registration
        </span>
        <SearchableSelect
          options={allRegs}
          value={toArr(fReg)}
          onChange={v => changePending({ fReg: v })}
          placeholder="Search reg..."
          multi
        />
      </div>

      <div className="filter-sep" />

      {/* ── Flight search ── */}
      <div className="filter-chip" data-type="flight">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Flight No.
        </span>
        <div className="filter-search-wrap">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="filter-flight-input"
            className="filter-input"
            type="text"
            placeholder="AT101..."
            value={fFlight}
            onChange={e => changePending({ fFlight: e.target.value })}
            aria-label="Search by flight number"
          />
          {fFlight && (
            <button className="filter-clear-btn" onClick={() => changePending({ fFlight: "" })} type="button" aria-label="Clear">x</button>
          )}
        </div>
      </div>

      {/* ── Apply button ── */}
      <button
        className={`filter-apply-btn ${hasPendingChanges ? "filter-apply-btn--active" : ""}`}
        onClick={handleApply}
        type="button"
        title="Apply filters"
        disabled={!hasPendingChanges}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Apply</span>
      </button>

      {/* ── Active filter badge ── */}
      {activeCount > 0 && (
        <button className="filter-active-badge" onClick={clearAll} title="Clear all filters" type="button">
          {activeCount} filter{activeCount > 1 ? "s" : ""}
          <span className="filter-clear-all">x</span>
        </button>
      )}

      {/* ── Right: Day Navigation + Actions ── */}
      <div className="filter-right">

        {/* Day navigator */}
        <div className="day-nav-group">
          <span className="filter-label" style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <CalendarIcon /> Days
          </span>
          <div className="day-nav-row">
            <button className="day-nav-arrow" onClick={() => onShiftDays(-1)} aria-label="Previous day" title="Previous day">
              <ChevronLeftIcon />
            </button>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                className={`day-nav-btn ${dayCount === n ? "day-nav-btn--active" : ""}`}
                onClick={() => onDayCountChange(n)}
              >
                {n}D
              </button>
            ))}
            <button className="day-nav-arrow" onClick={() => onShiftDays(1)} aria-label="Next day" title="Next day">
              <ChevronRightIcon />
            </button>
            <button className="day-nav-today" onClick={onResetToToday} title="Today">
              Today
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="filter-actions">
          {/* Charger button — commented out for now
          <button className="import-btn" onClick={onImport} type="button" title="Charger un fichier CSV / Excel">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Charger</span>
          </button>
          */}

          <button id="profiles-btn" className="profiles-btn" onClick={onOpenProfiles} type="button">
            <ProfilesIcon />
            <span>Profiles</span>
          </button>

          <button className="export-btn" onClick={onOpenExport} type="button" title="Export data">
            <ExportIcon />
            <span>Export</span>
          </button>
        </div>
      </div>

    </div>
  );
}
