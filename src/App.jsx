import "./App.css";
import { useState, useEffect } from "react";

/* Components */
import GanttBottomPanel from "./components/BottomBar/GanttBottomPanel";
import GanttTopbar from "./components/TopBar/GanttTopbar";
import FlightGantt from "./components/Gantt/FlightGantt";
import GanttFilterBar from "./components/Filters/GanttFilterBar";
import SideMenu from "./components/Menu/SideMenu";
import ProfileManager from "./components/Profiles/ProfileManager";

/* Pages */
import DashboardPage from "./components/pages/DashboardPage";
import SchedulePage from "./components/pages/SchedulePage";
import ReportsPage from "./components/pages/ReportsPage";
import AdminPage from "./components/pages/AdminPage";

/* Data */
import { legs } from "./data/flightsData";

/* ─────────────────────────────────────────────────────────── */

function App() {
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

  /* Filter state */
  const [filters, setFilters] = useState({
    fDate: "Toutes dates",
    fService: "Tous",
    fDep: "Tous",
    fArr: "Tous",
    fFlight: "",
    fSubtype: "Tous types",
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

  /* Navigate between pages (close bottom panel on nav) */
  function handleNavigate(page) {
    setCurrentPage(page);
    setSelectedLeg(null);
  }

  return (
    <div className="app-root">

      {/* ── Side Menu ──────────────────────────────── */}
      <SideMenu
        expanded={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        currentPage={currentPage}
        onNavigate={handleNavigate}
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
          {currentPage === "gantt" && (
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
              />

              {/* Timeline */}
              <div className="timeline-container">
                <FlightGantt
                  legs={legs}
                  filters={filters}
                  onSelectLeg={setSelectedLeg}
                />
              </div>

              {/* Bottom details panel */}
              <GanttBottomPanel
                leg={selectedLeg}
                onClose={() => setSelectedLeg(null)}
              />
            </div>
          )}

          {/* ── SCHEDULE PAGE ── */}
          {currentPage === "schedule" && <SchedulePage isDark={isDark} />}

          {/* ── REPORTS PAGE ── */}
          {currentPage === "reports" && <ReportsPage isDark={isDark} />}

          {/* ── ADMIN PAGE ── */}
          {currentPage === "admin" && <AdminPage isDark={isDark} />}

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

    </div>
  );
}

export default App;