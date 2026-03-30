import { useState, useEffect, useRef } from "react";
import "./GanttTopbar.css";
import ramLogoUrl from "../../assets/ram logo.jpeg";
import { useClock } from "../../hooks/useClock";

/* ── Inline SVG icons ────────────────────────────────────────── */

function SunIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}

const ROLE_LABELS = {
    admin: "Administrateur",
    staff_ops: "Staff Ops",
    chef_escale: "Chef d'Escale",
};

export default function GanttTopbar({ isDark, sidebarOpen, onToggleDark, currentUser, onLogout }) {
    const now = useClock();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef(null);

    useEffect(() => {
        if (!showUserMenu) return;
        const handler = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showUserMenu]);

    const timeHM = now.toTimeString().slice(0, 5);
    const timeSec = now.toTimeString().slice(6, 8);
    const utcTime = now.toUTCString().slice(17, 22);
    const dateStr = now.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

    return (
        <header className={`topbar ${sidebarOpen ? "sidebar-open" : ""}`}>

            {/* ── Brand ── */}
            <div className="topbar-brand">
                <div className="topbar-logo">
                    <img src={ramLogoUrl} alt="Royal Air Maroc" width="40" height="40" />
                </div>
                <div className="topbar-brand-text">
                    <div className="topbar-title">ROYAL AIR MAROC</div>
                    <div className="topbar-subtitle">OPS CONTROL CENTER</div>
                </div>
            </div>

            {/* ── Center: Clock pill ── */}
            <div className="topbar-center">
                <div className="topbar-clock">
                    <span className="topbar-clock-pulse" />
                    <span className="topbar-clock-hm">{timeHM}</span>
                    <span className="topbar-clock-sec">{timeSec}</span>
                    <span className="topbar-clock-divider" />
                    <span className="topbar-utc">{utcTime}Z</span>
                </div>
                <span className="topbar-date" style={{ textTransform: "capitalize" }}>{dateStr}</span>
            </div>

            {/* ── Right: Theme + User ── */}
            <div className="topbar-right">
                <button
                    className="topbar-toggle"
                    onClick={onToggleDark}
                    aria-label="Toggle dark/light mode"
                >
                    {isDark ? <SunIcon /> : <MoonIcon />}
                </button>

                {currentUser && (
                    <div className="topbar-user-wrap" ref={userMenuRef}>
                        <button
                            className="topbar-user-btn"
                            onClick={() => setShowUserMenu(v => !v)}
                            aria-label="User menu"
                        >
                            <span className="topbar-user-avatar">{currentUser.initials || "??"}</span>
                            <span className="topbar-user-name-inline">{currentUser.displayName}</span>
                        </button>

                        {showUserMenu && (
                            <div className="topbar-user-dropdown">
                                <div className="topbar-user-info">
                                    <div className="topbar-user-avatar-lg">{currentUser.initials}</div>
                                    <div>
                                        <div className="topbar-user-name">{currentUser.displayName}</div>
                                        <div className="topbar-user-role">{ROLE_LABELS[currentUser.role] || currentUser.role}</div>
                                    </div>
                                </div>
                                <div className="topbar-user-divider" />
                                <button className="topbar-user-logout" onClick={onLogout}>
                                    <LogoutIcon />
                                    <span>Deconnexion</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
