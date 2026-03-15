import { useState, useEffect, useRef } from "react";
import "./GanttTopbar.css";

/* ── Live clock hook ─────────────────────────────────────────── */
function useClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

/* ── Inline SVG icons ────────────────────────────────────────── */
function PlaneIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
            <path d="M16 1 L19.5 13 L31 16 L19.5 19 L17.5 29 L16 25 L14.5 29 L12.5 19 L1 16 L12.5 13 Z" />
        </svg>
    );
}

function ClockIcon({ size = 13 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function GlobeIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

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

function SignalIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4" />
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

function UserIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    );
}

const ROLE_LABELS = {
    admin: "Administrateur",
    staff_ops: "Staff Ops",
    chef_escale: "Chef d'Escale",
};

export default function GanttTopbar({ isDark, utcMode, sidebarOpen, onToggleDark, onToggleUtc, currentUser, onLogout }) {
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

    /* Formatted strings */
    const timeHM = now.toTimeString().slice(0, 5);
    const timeSec = now.toTimeString().slice(6, 8);
    const utcTime = now.toUTCString().slice(17, 22);
    const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

    /* Zulu offset */
    const utcOffset = -now.getTimezoneOffset();
    const offsetH = Math.floor(Math.abs(utcOffset) / 60);
    const offsetSign = utcOffset >= 0 ? "+" : "-";

    return (
        <header className={`topbar ${sidebarOpen ? "sidebar-open" : ""}`}>

            {/* ── Brand Section ─────────────────────────────── */}
            <div className="topbar-brand">
                <div className="topbar-logo">
                    <PlaneIcon />
                </div>
                <div className="topbar-brand-text">
                    <div className="topbar-title">ROYAL AIR MAROC</div>
                    <div className="topbar-subtitle">OPS CONTROL CENTER</div>
                </div>
            </div>

            {/* ── Center: Live Clock + Date ─────────────────── */}
            <div className="topbar-center">
                {/* Primary clock */}
                <div className="topbar-clock-group">
                    <div className="topbar-clock">
                        <span className="topbar-clock-hm">{timeHM}</span>
                        <span className="topbar-clock-sec">{timeSec}</span>
                    </div>
                    <div className="topbar-clock-label">
                        <span className="topbar-clock-pulse" />
                        LOCAL · UTC{offsetSign}{offsetH}
                    </div>
                </div>

                {/* Divider */}
                <div className="topbar-center-divider" />

                {/* UTC clock */}
                <div className="topbar-utc-group">
                    <div className="topbar-utc-time">{utcTime}Z</div>
                    <div className="topbar-utc-label">ZULU</div>
                </div>

                {/* Divider */}
                <div className="topbar-center-divider" />

                {/* Date chip */}
                <div className="topbar-date-chip">
                    <CalendarIcon />
                    <span style={{ textTransform: "capitalize" }}>{dateStr}</span>
                </div>
            </div>

            {/* ── Right: Status + Actions ───────────────────── */}
            <div className="topbar-right">
                {/* System status indicator */}
                <div className="topbar-status">
                    <SignalIcon />
                    <span className="topbar-status-dot" />
                    <span className="topbar-status-text">Système opérationnel</span>
                </div>

                {/* UTC / Local toggle */}
                <button
                    className={`topbar-toggle ${utcMode ? "topbar-toggle--active" : ""}`}
                    onClick={onToggleUtc}
                    aria-label="Toggle UTC/Local"
                >
                    <GlobeIcon />
                    <span>{utcMode ? "UTC" : "LT"}</span>
                </button>

                {/* Theme toggle */}
                <button
                    className="topbar-toggle"
                    onClick={onToggleDark}
                    aria-label="Toggle dark/light mode"
                >
                    {isDark ? <SunIcon /> : <MoonIcon />}
                    <span>{isDark ? "Jour" : "Nuit"}</span>
                </button>

                {/* User profile */}
                {currentUser && (
                    <div className="topbar-user-wrap" ref={userMenuRef}>
                        <button
                            className="topbar-user-btn"
                            onClick={() => setShowUserMenu(v => !v)}
                            aria-label="User menu"
                        >
                            <span className="topbar-user-avatar">{currentUser.initials || "??"}</span>
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
                                    <span>Déconnexion</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
