import "./App.css";
import { useState, useEffect } from "react";

/* Components */
import GanttBottomPanel from "./components/BottomBar/GanttBottomPanel";
import GanttTopbar from "./components/TopBar/GanttTopbar";
import FlightGantt from "./components/Gantt/FlightGantt";
import GanttFilterBar from "./components/Filters/GanttFilterBar";
import SideMenu from "./components/Menu/SideMenu";
import ProfileManager from "./components/Profiles/ProfileManager";
import ExportModal from "./components/Export/ExportModal";

/* Pages */
import SchedulePage from "./components/pages/SchedulePage";
import ReportsPage from "./components/pages/ReportsPage";
import AdminPage from "./components/pages/AdminPage";
import LoginPage from "./components/Auth/LoginPage";

/* Data */
import { legs } from "./data/flightsData";

/* ── Role-based access control ──────────────────────────────── */
const ROLE_PAGES = {
  admin:       ["gantt", "schedule", "reports", "admin"],
  staff_ops:   ["gantt", "schedule", "reports"],
  chef_escale: ["schedule", "reports"],
};

const ROLE_DEFAULT_PAGE = {
  admin:       "gantt",
  staff_ops:   "gantt",
  chef_escale: "schedule",
};

/* ─────────────────────────────────────────────────────────── */

function App() {
  /* Auth state */
  const [currentUser, setCurrentUser] = useState(null);

  /* Layout state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("gantt");

  /* UI state */
  const [selectedLeg, setSelectedLeg] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const [utcMode, setUtcMode] = useState(true);

  /* Sync theme */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const [zoom, setZoom] = useState(1);
  const [showProfiles, setShowProfiles] = useState(false);
  const [showExport, setShowExport] = useState(false);

  /* Filter state — all dropdowns are string[], [] = show all */
  const [filters, setFilters] = useState({
    fDate:    [],
    fService: [],
    fDep:     [],
    fArr:     [],
    fFlight:  "",
    fSubtype: [],
  });

  function changeFilter(update) {
    setFilters(prev => ({ ...prev, ...update }));
    // Clear bottom panel when filter changes
    setSelectedLeg(null);
  }

  function handleLoadProfile(profile) {
    if (profile.filters) setFilters(profile.filters);
    if (typeof profile.utcMode === "boolean") setUtcMode(profile.utcMode);
    if (typeof profile.zoom === "number") setZoom(profile.zoom);
  }

  /* ── Auth handlers ──────────────────────────────────────── */
  function handleLogin(user) {
    setCurrentUser(user);
    setCurrentPage(ROLE_DEFAULT_PAGE[user.role]);
    setSelectedLeg(null);
  }

  function handleLogout() {
    setCurrentUser(null);
    setCurrentPage("gantt");
    setSelectedLeg(null);
    setSidebarOpen(false);
  }

  /* Navigate between pages (close bottom panel on nav) */
  function handleNavigate(page) {
    if (!currentUser) return;
    const allowed = ROLE_PAGES[currentUser.role] ?? [];
    if (!allowed.includes(page)) return;
    setCurrentPage(page);
    setSelectedLeg(null);
  }

  /* Guard: make sure currentPage is always allowed for this role */
  const allowedPages = currentUser ? (ROLE_PAGES[currentUser.role] ?? []) : [];
  const safePage = allowedPages.includes(currentPage)
    ? currentPage
    : (ROLE_DEFAULT_PAGE[currentUser?.role] ?? "gantt");

  /* ── Show login screen when not authenticated ─────────── */
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-root">

      {/* ── Side Menu ──────────────────────────────── */}
      <SideMenu
        expanded={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        currentPage={safePage}
        onNavigate={handleNavigate}
        userRole={currentUser.role}
        userDisplayName={currentUser.displayName}
        userInitials={currentUser.initials}
        onLogout={handleLogout}
      />

      {/* ── Main Content ───────────────────────────── */}
      <div className={`app-main ${sidebarOpen ? "sidebar-open" : ""}`}>

        {/* Top Bar */}
        <GanttTopbar
          isDark={isDark}
          utcMode={utcMode}
          sidebarOpen={sidebarOpen}
          onToggleDark={() => setIsDark(d => !d)}
          onToggleUtc={() => setUtcMode(u => !u)}
        />

        {/* Page content */}
        <div className="page-content">

          {/* ── GANTT PAGE ── */}
          {safePage === "gantt" && (
            <div className="gantt-area">

              {/* Filter bar */}
              <GanttFilterBar
                filters={filters}
                onChange={changeFilter}
                zoom={zoom}
                onZoomIn={() => setZoom(z => Math.min(5, z + 0.2))}
                onZoomOut={() => setZoom(z => Math.max(0.4, z - 0.2))}
                onZoomReset={() => setZoom(1)}
                onOpenProfiles={() => setShowProfiles(true)}
                onOpenExport={() => setShowExport(true)}
              />

              {/* Timeline */}
              <div className="timeline-container">
                <FlightGantt
                  legs={legs}
                  filters={filters}
                  onSelectLeg={setSelectedLeg}
                  zoom={zoom}
                />
              </div>

              {/* Bottom details panel */}
              <GanttBottomPanel
                leg={selectedLeg}
                onClose={() => setSelectedLeg(null)}
                isDark={isDark}
              />
            </div>
          )}

          {/* ── SCHEDULE PAGE ── */}
          {safePage === "schedule" && <SchedulePage isDark={isDark} legs={legs} />}

          {/* ── REPORTS PAGE ── */}
          {safePage === "reports" && <ReportsPage isDark={isDark} />}

          {/* ── ADMIN PAGE ── */}
          {safePage === "admin" && <AdminPage isDark={isDark} />}

        </div>
      </div>

      {/* ── Profile Manager Modal ──────────────────── */}
      <ProfileManager
        isOpen={showProfiles}
        onClose={() => setShowProfiles(false)}
        currentFilters={filters}
        utcMode={utcMode}
        zoom={zoom}
        onLoadProfile={handleLoadProfile}
      />

      {/* ── Export Modal ───────────────────────────── */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        legs={legs}
        filters={filters}
      />

    </div>
  );
}

export default App;