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

function FilterIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
  referenceDate,
  onShiftDays,
  onResetToToday,
  onOpenProfiles,
  onOpenExport,
  onImport,
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

  const { fDate, fService, fDep, fArr, fFlight, fSubtype } = pending;

  function changePending(update) {
    setPending(prev => ({ ...prev, ...update }));
  }

  function handleApply() {
    onChange(pending);
  }

  function clearAll() {
    const empty = { fDate: [], fService: [], fDep: [], fArr: [], fFlight: "", fSubtype: [] };
    setPending(empty);
    onChange(empty);
  }

  // Detect unapplied changes
  const hasPendingChanges = JSON.stringify(pending) !== JSON.stringify(filters);

  // Build dynamic option lists from current legs data
  const allDeps     = useMemo(() => ["Tous", ...[...new Set(legs.map(l => l.dep).filter(Boolean))].sort()], [legs]);
  const allArrs     = useMemo(() => ["Tous", ...[...new Set(legs.map(l => l.arr).filter(Boolean))].sort()], [legs]);
  const allServices = useMemo(() => ["Tous", ...Object.keys(SERVICE_COLORS)], []);
  const allDates    = useMemo(() => ["Tous", ...[...new Set(legs.map(l => l.date).filter(Boolean))].sort()], [legs]);
  const allSubtypes = useMemo(() => ["Tous", ...SUBTYPE_OPTIONS.filter(t => t !== "Tous types")], []);

  const toArr = v => Array.isArray(v) ? v : [];
  const activeCount = [
    toArr(fDate).length > 0,
    toArr(fService).length > 0,
    toArr(fDep).length > 0,
    toArr(fArr).length > 0,
    fFlight !== "",
    toArr(fSubtype).length > 0,
  ].filter(Boolean).length;

  return (
    <div className="filter-bar">

      {/* View switcher */}
      <div className="view-switcher">
        <button
          className={`view-switch-btn ${viewMode === "gantt" ? "view-switch-btn--active" : ""}`}
          onClick={() => onViewChange && onViewChange("gantt")}
          title="Vue Gantt"
        >
          <GanttIcon />
          <span>Gantt</span>
        </button>
        <button
          className={`view-switch-btn ${viewMode === "board" ? "view-switch-btn--active" : ""}`}
          onClick={() => onViewChange && onViewChange("board")}
          title="Vue Tableau"
        >
          <BoardIcon />
          <span>Tableau</span>
        </button>
      </div>

      <div className="filter-sep" />

      {/* Filter icon label */}
      <div className="filter-bar-label">
        <FilterIcon />
        <span>Filtres</span>
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
          placeholder="Rechercher date..."
          multi
        />
      </div>

      <div className="filter-sep" />

      {/* ── DEP ── */}
      <div className="filter-chip" data-type="dep">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Depart
        </span>
        <SearchableSelect
          options={allDeps}
          value={toArr(fDep)}
          onChange={v => changePending({ fDep: v })}
          placeholder="Rechercher aeroport..."
          multi
        />
      </div>

      {/* ── ARR ── */}
      <div className="filter-chip" data-type="arr">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Arrivee
        </span>
        <SearchableSelect
          options={allArrs}
          value={toArr(fArr)}
          onChange={v => changePending({ fArr: v })}
          placeholder="Rechercher aeroport..."
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
          placeholder="Rechercher service..."
          multi
        />
      </div>

      {/* ── Subtype ── */}
      <div className="filter-chip" data-type="type">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Type avion
        </span>
        <SearchableSelect
          options={allSubtypes}
          value={toArr(fSubtype)}
          onChange={v => changePending({ fSubtype: v })}
          placeholder="Rechercher type..."
          multi
        />
      </div>

      <div className="filter-sep" />

      {/* ── Flight search ── */}
      <div className="filter-chip" data-type="flight">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Vol N
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
            aria-label="Rechercher par numero de vol"
          />
          {fFlight && (
            <button className="filter-clear-btn" onClick={() => changePending({ fFlight: "" })} type="button" aria-label="Effacer">x</button>
          )}
        </div>
      </div>

      {/* ── Apply button ── */}
      <button
        className={`filter-apply-btn ${hasPendingChanges ? "filter-apply-btn--active" : ""}`}
        onClick={handleApply}
        type="button"
        title="Appliquer les filtres"
        disabled={!hasPendingChanges}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Appliquer</span>
      </button>

      {/* ── Active filter badge ── */}
      {activeCount > 0 && (
        <button className="filter-active-badge" onClick={clearAll} title="Effacer tous les filtres" type="button">
          {activeCount} filtre{activeCount > 1 ? "s" : ""}
          <span className="filter-clear-all">x</span>
        </button>
      )}

      {/* ── Right: Day Navigation + Actions ── */}
      <div className="filter-right">

        {/* Day navigator */}
        <div className="day-nav-group">
          <span className="filter-label" style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <CalendarIcon /> Jours
          </span>
          <div className="day-nav-row">
            <button className="day-nav-arrow" onClick={() => onShiftDays(-1)} aria-label="Jour précédent" title="Jour précédent">
              <ChevronLeftIcon />
            </button>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                className={`day-nav-btn ${dayCount === n ? "day-nav-btn--active" : ""}`}
                onClick={() => onDayCountChange(n)}
              >
                {n}J
              </button>
            ))}
            <button className="day-nav-arrow" onClick={() => onShiftDays(1)} aria-label="Jour suivant" title="Jour suivant">
              <ChevronRightIcon />
            </button>
            <button className="day-nav-today" onClick={onResetToToday} title="Aujourd'hui">
              Auj.
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
            <span>Profils</span>
          </button>

          <button className="export-btn" onClick={onOpenExport} type="button" title="Exporter les donnees">
            <ExportIcon />
            <span>Exporter</span>
          </button>
        </div>
      </div>

    </div>
  );
}
