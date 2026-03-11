import { legs, dates } from "../../data/flightsData";
import { SERVICE_COLORS, SUBTYPE_OPTIONS } from "../../constants/ganttConstants";
import SearchableSelect from "./SearchableSelect";
import "./GanttFilterBar.css";

/* ── Dynamic filter option lists ─────────────────────────── */
const allDeps = ["Tous", ...[...new Set(legs.map(l => l.dep))].sort()];
const allArrs = ["Tous", ...[...new Set(legs.map(l => l.arr))].sort()];
const allServices = ["Tous", ...Object.keys(SERVICE_COLORS)];
const allDates = ["Toutes dates", ...dates];
const allSubtypes = SUBTYPE_OPTIONS;

export default function GanttFilterBar({
  filters,
  onChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenProfiles,
}) {
  const { fDate, fService, fDep, fArr, fFlight, fSubtype } = filters;

  /* Count active filters for badge */
  const activeCount = [
    fDate !== "Toutes dates" && fDate !== "Tous",
    fService !== "Tous",
    fDep !== "Tous",
    fArr !== "Tous",
    fFlight !== "",
    fSubtype !== "Tous types",
  ].filter(Boolean).length;

  function clearAll() {
    onChange({
      fDate: "Toutes dates",
      fService: "Tous",
      fDep: "Tous",
      fArr: "Tous",
      fFlight: "",
      fSubtype: "Tous types",
    });
  }

  return (
    <div className="filter-bar">

      {/* ── Date ── */}
      <SearchableSelect
        label="Date"
        options={allDates}
        value={fDate}
        onChange={v => onChange({ fDate: v })}
        placeholder="Rechercher date..."
      />

      <div className="filter-divider" />

      {/* ── DEP ── */}
      <SearchableSelect
        label="DEP"
        options={allDeps}
        value={fDep}
        onChange={v => onChange({ fDep: v })}
        placeholder="Rechercher aéroport..."
      />

      {/* ── ARR ── */}
      <SearchableSelect
        label="ARR"
        options={allArrs}
        value={fArr}
        onChange={v => onChange({ fArr: v })}
        placeholder="Rechercher aéroport..."
      />

      <div className="filter-divider" />

      {/* ── Service ── */}
      <SearchableSelect
        label="Service"
        options={allServices}
        value={fService}
        onChange={v => onChange({ fService: v })}
        placeholder="Rechercher service..."
      />

      {/* ── Subtype ── */}
      <SearchableSelect
        label="Type avion"
        options={allSubtypes}
        value={fSubtype}
        onChange={v => onChange({ fSubtype: v })}
        placeholder="Rechercher type..."
      />

      <div className="filter-divider" />

      {/* ── Flight search ── */}
      <div className="filter-group">
        <span className="filter-label">Vol N°</span>
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
            onChange={e => onChange({ fFlight: e.target.value })}
            aria-label="Rechercher par numéro de vol"
          />
          {fFlight && (
            <button
              className="filter-clear-btn"
              onClick={() => onChange({ fFlight: "" })}
              type="button"
              aria-label="Effacer la recherche"
            >×</button>
          )}
        </div>
      </div>

      {/* ── Active filter badge ── */}
      {activeCount > 0 && (
        <button
          className="filter-active-badge"
          onClick={clearAll}
          title="Effacer tous les filtres"
          type="button"
        >
          {activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
          <span className="filter-clear-all">×</span>
        </button>
      )}

      {/* ── Right: Zoom + Profiles ── */}
      <div className="filter-right">

        {/* Zoom */}
        <div className="zoom-control">
          <span className="filter-label">Zoom</span>
          <div className="zoom-row">
            <button className="zoom-btn" onClick={onZoomOut} aria-label="Zoom out">−</button>
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={onZoomIn} aria-label="Zoom in">+</button>
            <button className="zoom-reset-btn" onClick={onZoomReset} aria-label="Reset zoom" title="Réinitialiser zoom">↺</button>
          </div>
        </div>

        {/* Profiles */}
        <button
          id="profiles-btn"
          className="profiles-btn"
          onClick={onOpenProfiles}
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profils</span>
        </button>
      </div>

    </div>
  );
}