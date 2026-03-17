import { useState, useRef, useEffect } from "react";
import "./SearchableSelect.css";

/**
 * SearchableSelect — Reusable searchable dropdown.
 * Props:
 *   options:     string[]          — list of options
 *   value:       string|string[]   — current selection (string[] when multi=true)
 *   onChange:    (val) => void     — on selection change
 *   label:       string            — filter label above
 *   placeholder: string            — search input placeholder
 *   multi:       boolean           — enable multi-select mode (default: false)
 */
export default function SearchableSelect({
    options,
    value,
    onChange,
    label,
    placeholder = "Rechercher...",
    multi = false,
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        function handler(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = options.filter(o =>
        o.toLowerCase().includes(search.toLowerCase())
    );

    /* ── Single-select helpers ─────────────────────── */
    function select(opt) {
        onChange(opt);
        setOpen(false);
        setSearch("");
    }

    /* ── Multi-select helpers ──────────────────────── */
    function toggle(opt) {
        if (opt === "Tous") {
            onChange([]);
            return;
        }
        const arr = Array.isArray(value) ? value : [];
        if (arr.includes(opt)) {
            onChange(arr.filter(v => v !== opt));
        } else {
            onChange([...arr, opt]);
        }
        // dropdown stays open for multi
    }

    /* ── Trigger display label ─────────────────────── */
    function triggerLabel() {
        if (!multi) return value;
        const arr = Array.isArray(value) ? value : [];
        if (arr.length === 0) return "Tous";
        if (arr.length <= 2) return arr.join(" · ");
        return `${arr.length} sélectionnés`;
    }

    const isActive = multi && Array.isArray(value) && value.length > 0;

    return (
        <div className="ss-root" ref={ref}>
            {label && <span className="ss-label">{label}</span>}
            <button
                className={`ss-trigger ${open ? "open" : ""} ${isActive ? "active" : ""}`}
                onClick={() => { setOpen(o => !o); setSearch(""); }}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="ss-value">{triggerLabel()}</span>
                <svg className="ss-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="ss-dropdown" role="listbox">
                    {/* Search row */}
                    <div className="ss-search-wrap">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="ss-search"
                            type="text"
                            placeholder={placeholder}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                            aria-label="Search options"
                        />
                        {search && (
                            <button className="ss-clear-btn" onClick={() => setSearch("")} type="button">×</button>
                        )}
                    </div>

                    {/* Options list */}
                    <div className="ss-list">
                        {filtered.length === 0 ? (
                            <div className="ss-no-results">Aucun résultat</div>
                        ) : (
                            filtered.map(opt => {
                                const isSelected = multi
                                    ? (Array.isArray(value) && value.includes(opt))
                                    : opt === value;

                                return (
                                    <button
                                        key={opt}
                                        className={`ss-option ${isSelected ? "selected" : ""}`}
                                        onClick={() => multi ? toggle(opt) : select(opt)}
                                        role="option"
                                        aria-selected={isSelected}
                                        type="button"
                                    >
                                        {multi ? (
                                            <span className={`ss-checkbox ${isSelected ? "checked" : ""}`}>
                                                {isSelected && (
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </span>
                                        ) : (
                                            isSelected && (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )
                                        )}
                                        <span>{opt}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Multi footer: count + apply */}
                    {multi && (
                        <div className="ss-apply-row">
                            <span className="ss-apply-count">
                                {Array.isArray(value) && value.length > 0
                                    ? `${value.length} sélectionné${value.length > 1 ? "s" : ""}`
                                    : "Tous"}
                            </span>
                            <button
                                className="ss-apply-btn"
                                type="button"
                                onClick={() => { setOpen(false); setSearch(""); }}
                            >
                                Appliquer
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
