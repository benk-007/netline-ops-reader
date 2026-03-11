import "./SideMenu.css";

/* ── Icons as inline SVGs to avoid icon library dependency ── */

function GanttIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="3" rx="1.5" />
      <rect x="3" y="10.5" width="12" height="3" rx="1.5" />
      <rect x="3" y="17" width="15" height="3" rx="1.5" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const NAV_ITEMS = [
  { key: "gantt", label: "Gantt", Icon: GanttIcon },
  { key: "schedule", label: "Schedule", Icon: ScheduleIcon },
  { key: "reports", label: "Reports", Icon: ReportsIcon },
  { key: "admin", label: "Admin", Icon: AdminIcon },
];

export default function SideMenu({ expanded, onToggle, currentPage, onNavigate }) {
  return (
    <nav className={`sidemenu ${expanded ? "expanded" : ""}`} role="navigation" aria-label="Main navigation">

      {/* Hamburger toggle */}
      <button
        className="sidemenu-toggle"
        onClick={onToggle}
        aria-label={expanded ? "Collapse menu" : "Expand menu"}
        aria-expanded={expanded}
      >
        <div className="hamburger-icon">
          <div className="hamburger-line" />
          <div className="hamburger-line" />
          <div className="hamburger-line" />
        </div>
      </button>

      <div className="sidemenu-top-divider" />

      {/* Nav items */}
      <div className="sidemenu-nav">
        {NAV_ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`sidemenu-item ${currentPage === key ? "active" : ""}`}
            onClick={() => onNavigate(key)}
            title={!expanded ? label : undefined}
            aria-label={label}
            aria-current={currentPage === key ? "page" : undefined}
          >
            <span className="sidemenu-icon">
              <Icon />
            </span>
            <span className="sidemenu-label">{label}</span>
          </button>
        ))}
      </div>

      {/* Bottom — user badge */}
      <div className="sidemenu-bottom">
        <div className="sidemenu-avatar">
          <div className="sidemenu-avatar-circle">OPS</div>
          {expanded && (
            <div className="sidemenu-avatar-info">
              <div className="sidemenu-avatar-name">Dispatcher</div>
              <div className="sidemenu-avatar-role">RAM Ops Center</div>
            </div>
          )}
        </div>
      </div>

    </nav>
  );
}
