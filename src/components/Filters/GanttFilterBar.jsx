import { legs, dates } from "../../data/flightsData";
import { SERVICE_COLORS, SUBTYPE_OPTIONS } from "../../constants/ganttConstants";
import SearchableSelect from "./SearchableSelect";
import "./GanttFilterBar.css";

/* ── Dynamic filter option lists ─────────────────────────── */
const allDeps     = ["Tous", ...[...new Set(legs.map(l => l.dep))].sort()];
const allArrs     = ["Tous", ...[...new Set(legs.map(l => l.arr))].sort()];
const allServices = ["Tous", ...Object.keys(SERVICE_COLORS)];
const allDates    = ["Tous", ...dates];
const allSubtypes = ["Tous", ...SUBTYPE_OPTIONS.filter(t => t !== "Tous types")];

function ZoomIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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

export default function GanttFilterBar({
  filters,
  onChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenProfiles,
  onOpenExport,
}) {
  const { fDate, fService, fDep, fArr, fFlight, fSubtype } = filters;

  const toArr = v => Array.isArray(v) ? v : [];
  const activeCount = [
    toArr(fDate).length > 0,
    toArr(fService).length > 0,
    toArr(fDep).length > 0,
    toArr(fArr).length > 0,
    fFlight !== "",
    toArr(fSubtype).length > 0,
  ].filter(Boolean).length;

  function clearAll() {
    onChange({ fDate: [], fService: [], fDep: [], fArr: [], fFlight: "", fSubtype: [] });
  }

  return (
    <div className="filter-bar">

      {/* ── Date ── */}
      <div className="filter-chip" data-type="date">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Date
        </span>
        <SearchableSelect
          options={allDates}
          value={toArr(fDate)}
          onChange={v => onChange({ fDate: v })}
          placeholder="Rechercher date..."
          multi
        />
      </div>

      <div className="filter-sep" />

      {/* ── DEP ── */}
      <div className="filter-chip" data-type="dep">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Départ
        </span>
        <SearchableSelect
          options={allDeps}
          value={toArr(fDep)}
          onChange={v => onChange({ fDep: v })}
          placeholder="Rechercher aéroport..."
          multi
        />
      </div>

      {/* ── ARR ── */}
      <div className="filter-chip" data-type="arr">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Arrivée
        </span>
        <SearchableSelect
          options={allArrs}
          value={toArr(fArr)}
          onChange={v => onChange({ fArr: v })}
          placeholder="Rechercher aéroport..."
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
          onChange={v => onChange({ fService: v })}
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
          onChange={v => onChange({ fSubtype: v })}
          placeholder="Rechercher type..."
          multi
        />
      </div>

      <div className="filter-sep" />

      {/* ── Flight search ── */}
      <div className="filter-chip" data-type="flight">
        <span className="filter-chip-label">
          <span className="filter-chip-dot" />
          Vol N°
        </span>
        <div className="filter-search-wrap">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="filter-flight-input"
            className="filter-input"
            type="text"
            placeholder="AT101…"
            value={fFlight}
            onChange={e => onChange({ fFlight: e.target.value })}
            aria-label="Rechercher par numéro de vol"
          />
          {fFlight && (
            <button className="filter-clear-btn" onClick={() => onChange({ fFlight: "" })} type="button" aria-label="Effacer">×</button>
          )}
        </div>
      </div>

      {/* ── Active filter badge ── */}
      {activeCount > 0 && (
        <button className="filter-active-badge" onClick={clearAll} title="Effacer tous les filtres" type="button">
          {activeCount} filtre{activeCount > 1 ? "s" : ""}
          <span className="filter-clear-all">×</span>
        </button>
      )}

      {/* ── Right: Zoom + Actions ── */}
      <div className="filter-right">

        {/* Zoom pill */}
        <div className="zoom-group">
          <span className="filter-label" style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <ZoomIcon /> Zoom
          </span>
          <div className="zoom-row">
            <button className="zoom-btn" onClick={onZoomOut} aria-label="Zoom out">−</button>
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={onZoomIn} aria-label="Zoom in">+</button>
            <button className="zoom-reset-btn" onClick={onZoomReset} aria-label="Reset zoom" title="Réinitialiser">↺</button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="filter-actions">
          <button id="profiles-btn" className="profiles-btn" onClick={onOpenProfiles} type="button">
            <ProfilesIcon />
            <span>Profils</span>
          </button>

          <button className="export-btn" onClick={onOpenExport} type="button" title="Exporter les données en CSV">
            <ExportIcon />
            <span>Exporter</span>
          </button>
        </div>
      </div>

    </div>
  );
}
