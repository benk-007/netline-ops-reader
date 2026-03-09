import { useState, useEffect } from "react";
import "./GanttTopbar.css";

export default function GanttTopbar({ isDark, utcMode, sidebarOpen, onToggleDark, onToggleUtc }) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const tick = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);
    return (
        <header className={`topbar ${sidebarOpen ? "sidebar-open" : ""}`}>

            {/* Brand */}
            <div className="topbar-brand">
                <div className="topbar-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.7 1.1l2 4.5c.2.4.6.6 1 .6H8l-1 2.5c-.1.3 0 .7.3.9l2 1.4c.3.2.7.2 1-.1l1.5-1.5 4.5 2c.6.2 1-.2 1.1-.7z" />
                    </svg>
                </div>
                <div>
                    <div className="topbar-title">ROYAL AIR MAROC</div>
                    <div className="topbar-subtitle">GANTT · ROTATIONS AVIONS</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 19, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{time.toTimeString().slice(0, 8)}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, marginTop: 2 }}>CMN · UTC+1</div>
                </div>
            </div>

            {/* Center — date chip */}
            <div className="topbar-date-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span style={{ textTransform: "capitalize" }}>{dateStr}</span>
            </div>

            {/* Right actions */}
            <div className="topbar-actions">
                <button className="topbar-btn" onClick={onToggleUtc} aria-label="Toggle UTC/Local">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {utcMode ? "UTC" : "LOCAL"}
                </button>
                <button className="topbar-btn" onClick={onToggleDark} aria-label="Toggle dark/light mode">
                    {isDark ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    )}
                    {isDark ? "Jour" : "Nuit"}
                </button>
            </div>
        </header>
    );
}
