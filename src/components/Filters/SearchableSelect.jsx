import { useState, useRef, useEffect } from "react";
import "./SearchableSelect.css";

/**
 * SearchableSelect — Reusable searchable dropdown.
 * Props:
 *   options: string[]        — list of options
 *   value: string            — current selection
 *   onChange: (val) => void  — on selection change
 *   label: string            — filter label above
 *   placeholder: string      — search input placeholder
 */
export default function SearchableSelect({ options, value, onChange, label, placeholder = "Rechercher..." }) {
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

    function select(opt) {
        onChange(opt);
        setOpen(false);
        setSearch("");
    }

    return (
        <div className="ss-root" ref={ref}>
            {label && <span className="ss-label">{label}</span>}
            <button
                className={`ss-trigger ${open ? "open" : ""}`}
                onClick={() => { setOpen(o => !o); setSearch(""); }}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="ss-value">{value}</span>
                <svg className="ss-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="ss-dropdown" role="listbox">
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
                    <div className="ss-list">
                        {filtered.length === 0 ? (
                            <div className="ss-no-results">Aucun résultat</div>
                        ) : (
                            filtered.map(opt => (
                                <button
                                    key={opt}
                                    className={`ss-option ${opt === value ? "selected" : ""}`}
                                    onClick={() => select(opt)}
                                    role="option"
                                    aria-selected={opt === value}
                                    type="button"
                                >
                                    {opt === value && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                    <span>{opt}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
