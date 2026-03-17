import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import "./ExportModal.css";

/* ── Field groups to export — mapped to new DB schema ──────── */
const FIELD_GROUPS = [
    {
        title: "Identite vol",
        fields: [
            { key: "LEG_NO",          label: "LEG_NO"      },
            { key: "FN_CARRIER",      label: "Compagnie"   },
            { key: "FN_NUMBER",       label: "N Vol"       },
            { key: "FN_SUFFIX",       label: "Suffixe"     },
            { key: "DAY_OF_ORIGIN",   label: "Date"        },
        ],
    },
    {
        title: "Appareil",
        fields: [
            { key: "AC_REGISTRATION", label: "Immat."      },
            { key: "AC_SUBTYPE",      label: "Type"        },
            { key: "AC_OWNER",        label: "Proprietaire"},
            { key: "AC_VERSION",      label: "Version"     },
        ],
    },
    {
        title: "Route",
        fields: [
            { key: "DEP_AP_SCHED",    label: "DEP (prevu)" },
            { key: "ARR_AP_SCHED",    label: "ARR (prevu)" },
            { key: "DEP_AP_ACTUAL",   label: "DEP (reel)"  },
            { key: "ARR_AP_ACTUAL",   label: "ARR (reel)"  },
        ],
    },
    {
        title: "Horaires planifies",
        fields: [
            { key: "DEP_TIME_SCHED",  label: "Heure Dep."  },
            { key: "ARR_TIME_SCHED",  label: "Heure Arr."  },
            { key: "DEP_DAY_SCHED",   label: "Jour Dep."   },
            { key: "ARR_DAY_SCHED",   label: "Jour Arr."   },
        ],
    },
    {
        title: "OOOI (Reels)",
        fields: [
            { key: "OFF_BLOCK_TIME",  label: "Off Block"   },
            { key: "AIRBORNE_TIME",   label: "Airborne"    },
            { key: "LANDING_TIME",    label: "Landing"     },
            { key: "ON_BLOCK_TIME",   label: "On Block"    },
        ],
    },
    {
        title: "Statut & Retards",
        fields: [
            { key: "LEG_STATE",       label: "Statut"      },
            { key: "LEG_TYPE",        label: "Type leg"    },
            { key: "DELAY_CODE_01",   label: "Code Ret. 1" },
            { key: "DELAY_TIME_01",   label: "Tps Ret. 1"  },
            { key: "DELAY_CODE_02",   label: "Code Ret. 2" },
            { key: "DELAY_TIME_02",   label: "Tps Ret. 2"  },
        ],
    },
    {
        title: "Systeme",
        fields: [
            { key: "UPDATE_KEY",      label: "Update Key"  },
            { key: "ENTRY_USER",      label: "Utilisateur" },
            { key: "CHANGE_TIME",     label: "Modifie le"  },
        ],
    },
];

const ALL_KEYS = FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key));
const KEY_TO_LABEL = Object.fromEntries(FIELD_GROUPS.flatMap(g => g.fields.map(f => [f.key, f.label])));

const DEFAULT_SELECTED = new Set([
    "LEG_NO", "FN_CARRIER", "FN_NUMBER", "DAY_OF_ORIGIN",
    "AC_REGISTRATION", "AC_SUBTYPE",
    "DEP_AP_SCHED", "ARR_AP_SCHED",
    "DEP_TIME_SCHED", "ARR_TIME_SCHED",
    "OFF_BLOCK_TIME", "AIRBORNE_TIME", "LANDING_TIME", "ON_BLOCK_TIME",
    "LEG_STATE", "LEG_TYPE", "DELAY_CODE_01", "DELAY_TIME_01",
]);

/* ── Apply the same filter logic as FlightGantt ────────────── */
function applyFilters(allLegs, filters) {
    const { fDate, fService, fDep, fArr, fFlight, fSubtype } = filters || {};
    const toArr = v => Array.isArray(v) ? v : [];

    return allLegs.filter(leg => {
        if (toArr(fDate).length > 0    && !toArr(fDate).includes(leg.date))       return false;
        if (toArr(fService).length > 0 && !toArr(fService).includes(leg.service)) return false;
        if (toArr(fDep).length > 0     && !toArr(fDep).includes(leg.dep))         return false;
        if (toArr(fArr).length > 0     && !toArr(fArr).includes(leg.arr))         return false;
        if (toArr(fSubtype).length > 0 && !toArr(fSubtype).includes(leg.subtype)) return false;
        if (fFlight && !leg.fn.toLowerCase().includes(fFlight.toLowerCase()))     return false;
        return true;
    });
}

function CheckIcon() {
    return (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function ExportHeaderIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    );
}

function ChevronDown() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function ChevronRight() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
        </svg>
    );
}

function FilterIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    );
}

/* ── Multi-select chip helper ──────────────────────────────── */
function ChipSelect({ options, selected, onChange, label }) {
    function toggle(val) {
        const next = selected.includes(val)
            ? selected.filter(v => v !== val)
            : [...selected, val];
        onChange(next);
    }
    return (
        <div className="em-filter-field">
            <span className="em-filter-label">{label}</span>
            <div className="em-filter-chips">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        className={`em-filter-chip ${selected.includes(opt) ? "active" : ""}`}
                        onClick={() => toggle(opt)}
                    >
                        {opt}
                    </button>
                ))}
                {options.length === 0 && <span className="em-filter-empty">--</span>}
            </div>
        </div>
    );
}

const FORMAT_OPTIONS = [
    { key: "xlsx", label: "Excel (.xlsx)" },
    { key: "csv",  label: "CSV" },
];

const SEP_OPTIONS = [
    { key: ",",  label: "Virgule" },
    { key: ";",  label: "Point-virgule" },
    { key: "\t", label: "Tab" },
];

export default function ExportModal({ isOpen, onClose, legs, filters }) {
    const [selected, setSelected] = useState(new Set(DEFAULT_SELECTED));
    const [separator, setSeparator] = useState(";");
    const [format, setFormat] = useState("xlsx");

    /* ── Local export filter state ─────────────────────────── */
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [localDep, setLocalDep] = useState([]);
    const [localArr, setLocalArr] = useState([]);
    const [localService, setLocalService] = useState([]);
    const [localSubtype, setLocalSubtype] = useState([]);
    const [localFlight, setLocalFlight] = useState("");
    const [localDate, setLocalDate] = useState([]);

    /* Unique option lists extracted from ALL legs */
    const uniqueDeps     = useMemo(() => [...new Set(legs.map(l => l.dep).filter(Boolean))].sort(), [legs]);
    const uniqueArrs     = useMemo(() => [...new Set(legs.map(l => l.arr).filter(Boolean))].sort(), [legs]);
    const uniqueServices = useMemo(() => [...new Set(legs.map(l => l.service).filter(Boolean))].sort(), [legs]);
    const uniqueSubtypes = useMemo(() => [...new Set(legs.map(l => l.subtype).filter(Boolean))].sort(), [legs]);
    const uniqueDates    = useMemo(() => [...new Set(legs.map(l => l.date).filter(Boolean))].sort(), [legs]);

    /* Initialize local filters from incoming filters prop when modal opens */
    useEffect(() => {
        if (isOpen) {
            const toArr = v => (Array.isArray(v) ? v : []);
            setLocalDep(toArr(filters?.fDep));
            setLocalArr(toArr(filters?.fArr));
            setLocalService(toArr(filters?.fService));
            setLocalSubtype(toArr(filters?.fSubtype));
            setLocalFlight(filters?.fFlight || "");
            setLocalDate(toArr(filters?.fDate));
        }
    }, [isOpen, filters]);

    /* Compute filtered legs from LOCAL filter state */
    const localFilters = useMemo(() => ({
        fDep: localDep,
        fArr: localArr,
        fService: localService,
        fSubtype: localSubtype,
        fFlight: localFlight,
        fDate: localDate,
    }), [localDep, localArr, localService, localSubtype, localFlight, localDate]);

    const filteredLegs = useMemo(() => applyFilters(legs, localFilters), [legs, localFilters]);

    const activeFilterCount = [localDep, localArr, localService, localSubtype, localDate]
        .filter(a => a.length > 0).length + (localFlight ? 1 : 0);

    function resetLocalFilters() {
        setLocalDep([]);
        setLocalArr([]);
        setLocalService([]);
        setLocalSubtype([]);
        setLocalFlight("");
        setLocalDate([]);
    }

    if (!isOpen) return null;

    function toggle(key) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }

    function selectAll()   { setSelected(new Set(ALL_KEYS)); }
    function deselectAll() { setSelected(new Set()); }

    function handleExport() {
        const keys = ALL_KEYS.filter(k => selected.has(k));
        if (keys.length === 0 || filteredLegs.length === 0) return;

        if (format === "xlsx") {
            // Build data rows with readable headers
            const headers = keys.map(k => KEY_TO_LABEL[k] || k);
            const dataRows = filteredLegs.map(leg =>
                keys.map(k => {
                    const v = leg[k];
                    return v === null || v === undefined ? "" : v;
                })
            );

            const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

            // Auto-size columns
            ws["!cols"] = headers.map((h, i) => {
                let maxLen = h.length;
                for (const row of dataRows) {
                    const cellLen = String(row[i] ?? "").length;
                    if (cellLen > maxLen) maxLen = cellLen;
                }
                return { wch: Math.min(maxLen + 2, 40) };
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Flights");
            XLSX.writeFile(wb, `ram_gantt_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } else {
            // CSV export
            const header = keys.map(k => KEY_TO_LABEL[k] || k).join(separator);
            const rows = filteredLegs.map(leg =>
                keys.map(k => {
                    const v = leg[k];
                    const str = v === null || v === undefined ? "" : String(v);
                    return str.includes(separator) || str.includes("\n")
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                }).join(separator)
            );

            const csv = [header, ...rows].join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ram_gantt_export_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

        onClose();
    }

    return (
        <div className="em-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="em-modal" role="dialog" aria-label="Export" aria-modal="true">

                {/* Header */}
                <div className="em-header">
                    <div className="em-header-left">
                        <div className="em-header-icon"><ExportHeaderIcon /></div>
                        <div>
                            <div className="em-title">Exporter les donnees</div>
                            <div className="em-subtitle">Selectionnez les champs et le format d'export</div>
                            <div className="em-count-badge">
                                {filteredLegs.length} leg{filteredLegs.length > 1 ? "s" : ""} correspondant{filteredLegs.length > 1 ? "s" : ""}
                            </div>
                        </div>
                    </div>
                    <button className="em-close" onClick={onClose} aria-label="Fermer">x</button>
                </div>

                <div className="em-body">

                    {/* ── Export filter section ── */}
                    <div className="em-filter-section">
                        <button
                            type="button"
                            className="em-filter-header"
                            onClick={() => setFiltersOpen(o => !o)}
                        >
                            <div className="em-filter-header-left">
                                <FilterIcon />
                                <span className="em-filter-title">Filtres d'export</span>
                                {activeFilterCount > 0 && (
                                    <span className="em-filter-badge">{activeFilterCount}</span>
                                )}
                            </div>
                            <span className="em-filter-chevron">
                                {filtersOpen ? <ChevronDown /> : <ChevronRight />}
                            </span>
                        </button>

                        {filtersOpen && (
                            <div className="em-filter-body">
                                <ChipSelect label="Aeroport DEP" options={uniqueDeps} selected={localDep} onChange={setLocalDep} />
                                <ChipSelect label="Aeroport ARR" options={uniqueArrs} selected={localArr} onChange={setLocalArr} />
                                <ChipSelect label="Type de service" options={uniqueServices} selected={localService} onChange={setLocalService} />
                                <ChipSelect label="Sous-type appareil" options={uniqueSubtypes} selected={localSubtype} onChange={setLocalSubtype} />
                                <ChipSelect label="Date" options={uniqueDates} selected={localDate} onChange={setLocalDate} />

                                <div className="em-filter-field">
                                    <span className="em-filter-label">N de vol</span>
                                    <input
                                        type="text"
                                        className="em-filter-input"
                                        placeholder="Rechercher un vol..."
                                        value={localFlight}
                                        onChange={e => setLocalFlight(e.target.value)}
                                    />
                                </div>

                                {activeFilterCount > 0 && (
                                    <button type="button" className="em-filter-reset" onClick={resetLocalFilters}>
                                        Reinitialiser
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Format selector */}
                    <div className="em-format-row">
                        <span className="em-format-label">Format :</span>
                        <div className="em-format-options">
                            {FORMAT_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    className={`em-format-btn ${format === opt.key ? "active" : ""}`}
                                    type="button"
                                    onClick={() => setFormat(opt.key)}
                                >
                                    {opt.key === "xlsx" && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <path d="M9 3v18M3 9h18M3 15h18" />
                                        </svg>
                                    )}
                                    {opt.key === "csv" && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    )}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CSV separator (only for CSV) */}
                    {format === "csv" && (
                        <div className="em-sep-row">
                            <span className="em-sep-label">Separateur :</span>
                            <div className="em-sep-options">
                                {SEP_OPTIONS.map(opt => (
                                    <button
                                        key={opt.key}
                                        className={`em-sep-btn ${separator === opt.key ? "active" : ""}`}
                                        type="button"
                                        onClick={() => setSeparator(opt.key)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Select all / deselect all */}
                    <div className="em-select-all-row">
                        <span className="em-select-all-label">Champs a exporter</span>
                        <div className="em-select-all-btns">
                            <button className="em-link-btn select" type="button" onClick={selectAll}>Tout selectionner</button>
                            <span style={{ color: "var(--color-dim)" }}>.</span>
                            <button className="em-link-btn deselect" type="button" onClick={deselectAll}>Tout decocher</button>
                        </div>
                    </div>

                    {/* Field groups */}
                    {FIELD_GROUPS.map(group => (
                        <div key={group.title} className="em-group">
                            <div className="em-group-title">{group.title}</div>
                            <div className="em-fields">
                                {group.fields.map(({ key, label }) => {
                                    const checked = selected.has(key);
                                    return (
                                        <div
                                            key={key}
                                            className={`em-field-row ${checked ? "checked" : ""}`}
                                            onClick={() => toggle(key)}
                                        >
                                            <div className="em-checkbox">
                                                {checked && <CheckIcon />}
                                            </div>
                                            <span className="em-field-name">{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="em-footer">
                    <span className="em-selected-count">
                        <strong>{selected.size}</strong> champ{selected.size > 1 ? "s" : ""} selectionne{selected.size > 1 ? "s" : ""}
                    </span>
                    <div className="em-footer-btns">
                        <button className="em-cancel-btn" type="button" onClick={onClose}>Annuler</button>
                        <button
                            className="em-export-btn"
                            type="button"
                            onClick={handleExport}
                            disabled={selected.size === 0 || filteredLegs.length === 0}
                        >
                            <DownloadIcon />
                            {format === "xlsx" ? "Exporter Excel" : "Exporter CSV"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
