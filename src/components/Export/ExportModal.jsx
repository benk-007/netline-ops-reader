import { useState, useMemo } from "react";
import "./ExportModal.css";

/* ── Field groups to export — mapped to new DB schema ──────── */
const FIELD_GROUPS = [
    {
        title: "Identité vol",
        fields: [
            { key: "LEG_NO",          label: "LEG_NO"      },
            { key: "FN_CARRIER",      label: "Compagnie"   },
            { key: "FN_NUMBER",       label: "N° Vol"      },
            { key: "FN_SUFFIX",       label: "Suffixe"     },
            { key: "DAY_OF_ORIGIN",   label: "Date"        },
        ],
    },
    {
        title: "Appareil",
        fields: [
            { key: "AC_REGISTRATION", label: "Immat."      },
            { key: "AC_SUBTYPE",      label: "Type"        },
            { key: "AC_OWNER",        label: "Propriétaire"},
            { key: "AC_VERSION",      label: "Version"     },
        ],
    },
    {
        title: "Route",
        fields: [
            { key: "DEP_AP_SCHED",    label: "DEP (prévu)" },
            { key: "ARR_AP_SCHED",    label: "ARR (prévu)" },
            { key: "DEP_AP_ACTUAL",   label: "DEP (réel)"  },
            { key: "ARR_AP_ACTUAL",   label: "ARR (réel)"  },
        ],
    },
    {
        title: "Horaires planifiés",
        fields: [
            { key: "DEP_TIME_SCHED",  label: "Heure Dép."  },
            { key: "ARR_TIME_SCHED",  label: "Heure Arr."  },
            { key: "DEP_DAY_SCHED",   label: "Jour Dép."   },
            { key: "ARR_DAY_SCHED",   label: "Jour Arr."   },
        ],
    },
    {
        title: "OOOI (Réels)",
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
        title: "Système",
        fields: [
            { key: "UPDATE_KEY",      label: "Update Key"  },
            { key: "ENTRY_USER",      label: "Utilisateur" },
            { key: "CHANGE_TIME",     label: "Modifié le"  },
        ],
    },
];

const ALL_KEYS = FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key));
const DEFAULT_SELECTED = new Set([
    "LEG_NO", "FN_CARRIER", "FN_NUMBER", "DAY_OF_ORIGIN",
    "AC_REGISTRATION", "AC_SUBTYPE",
    "DEP_AP_SCHED", "ARR_AP_SCHED",
    "DEP_TIME_SCHED", "ARR_TIME_SCHED",
    "OFF_BLOCK_TIME", "AIRBORNE_TIME", "LANDING_TIME", "ON_BLOCK_TIME",
    "LEG_STATE", "LEG_TYPE", "DELAY_CODE_01", "DELAY_TIME_01",
]);

const SEP_OPTIONS = [
    { key: ",",  label: "Virgule" },
    { key: ";",  label: "Point-virgule" },
    { key: "\t", label: "Tab" },
];

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

export default function ExportModal({ isOpen, onClose, legs, filters }) {
    const [selected, setSelected] = useState(new Set(DEFAULT_SELECTED));
    const [separator, setSeparator] = useState(",");

    const filteredLegs = useMemo(() => applyFilters(legs, filters), [legs, filters]);

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

        const header = keys.join(separator);
        const rows = filteredLegs.map(leg =>
            keys.map(k => {
                const v = leg[k];
                const str = v === null || v === undefined ? "" : String(v);
                // Quote if contains separator or newline
                return str.includes(separator) || str.includes("\n")
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(separator)
        );

        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ram_gantt_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
    }

    return (
        <div className="em-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="em-modal" role="dialog" aria-label="Export CSV" aria-modal="true">

                {/* Header */}
                <div className="em-header">
                    <div className="em-header-left">
                        <div className="em-header-icon"><ExportHeaderIcon /></div>
                        <div>
                            <div className="em-title">Exporter les données</div>
                            <div className="em-subtitle">Sélectionnez les champs à inclure dans l'export CSV</div>
                            <div className="em-count-badge">
                                {filteredLegs.length} leg{filteredLegs.length > 1 ? "s" : ""} correspondant{filteredLegs.length > 1 ? "s" : ""}
                            </div>
                        </div>
                    </div>
                    <button className="em-close" onClick={onClose} aria-label="Fermer">×</button>
                </div>

                <div className="em-body">

                    {/* Select all / deselect all */}
                    <div className="em-select-all-row">
                        <span className="em-select-all-label">Champs à exporter</span>
                        <div className="em-select-all-btns">
                            <button className="em-link-btn select" type="button" onClick={selectAll}>Tout sélectionner</button>
                            <span style={{ color: "var(--color-dim)" }}>·</span>
                            <button className="em-link-btn deselect" type="button" onClick={deselectAll}>Tout décocher</button>
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

                    {/* Separator */}
                    <div className="em-sep-row">
                        <span className="em-sep-label">Séparateur :</span>
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
                </div>

                {/* Footer */}
                <div className="em-footer">
                    <span className="em-selected-count">
                        <strong>{selected.size}</strong> champ{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
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
                            Exporter CSV
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
