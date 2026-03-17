import "./App.css";
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

/* Components */
import GanttBottomPanel from "./components/BottomBar/GanttBottomPanel";
import GanttTopbar from "./components/TopBar/GanttTopbar";
import FlightGantt from "./components/Gantt/FlightGantt";
import GanttFilterBar from "./components/Filters/GanttFilterBar";
import SideMenu from "./components/Menu/SideMenu";
import ProfileManager from "./components/Profiles/ProfileManager";
import ExportModal from "./components/Export/ExportModal";
import FlightBoard from "./components/FlightBoard/FlightBoard";

/* Pages */
import SchedulePage from "./components/pages/SchedulePage";
import ReportsPage from "./components/pages/ReportsPage";
import AdminPage from "./components/pages/AdminPage";
import LoginPage from "./components/Auth/LoginPage";

/* Data */
import { legs as defaultLegs, Leg } from "./data/flightsData";

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
  /* Flight data state — can be replaced via CSV upload in Admin */
  const [legsData, setLegsData] = useState(defaultLegs);

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
  const [viewMode, setViewMode] = useState("gantt");
  const importRef = useRef(null);

  /* ── Quick CSV/Excel import from Gantt page ──────────────── */
  function normalizeDate(val) {
    if (val == null || val === '') return null;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
    if (val instanceof Date) {
      return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,'0')}-${String(val.getDate()).padStart(2,'0')}`;
    }
    const num = Number(val);
    if (!isNaN(num) && num > 40000 && num < 60000) {
      const d = new Date(new Date(1899,11,30).getTime() + num * 86400000);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    let str = String(val).trim().replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim();
    const parts = str.split(/[/\-.]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (a.length === 4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
      if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    }
    return str || null;
  }

  function normalizeTime(val) {
    if (val == null || val === '') return null;
    if (typeof val === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val.trim())) return val.trim().slice(0,5).padStart(5,'0');
    if (val instanceof Date) return `${String(val.getHours()).padStart(2,'0')}:${String(val.getMinutes()).padStart(2,'0')}`;
    const num = Number(val);
    if (!isNaN(num) && num >= 0 && num < 1) {
      const mins = Math.round(num * 1440);
      return `${String(Math.floor(mins/60)%24).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
    }
    return String(val).trim() || null;
  }

  function processImportRows(headerRow, dataRows) {
    const colIdx = {};
    headerRow.forEach((h, i) => { colIdx[String(h).trim().toUpperCase()] = i; });
    const required = ['LEG_NO','FN_CARRIER','FN_NUMBER','DEP_AP_SCHED','ARR_AP_SCHED','DEP_TIME_SCHED','ARR_TIME_SCHED','DAY_OF_ORIGIN'];
    const missing = required.filter(c => colIdx[c] === undefined);
    if (missing.length > 0) { alert(`Colonnes manquantes: ${missing.join(', ')}`); return; }

    const g = (row, col) => { const i = colIdx[col]; return i !== undefined && row[i] != null ? String(row[i]).trim() || null : null; };
    const gd = (row, col) => { const i = colIdx[col]; return i !== undefined ? normalizeDate(row[i]) : null; };
    const gt = (row, col) => { const i = colIdx[col]; return i !== undefined ? normalizeTime(row[i]) : null; };

    const newLegs = [];
    for (const cells of dataRows) {
      const legNo = g(cells,'LEG_NO'), carrier = g(cells,'FN_CARRIER'), fnNum = g(cells,'FN_NUMBER');
      const day = gd(cells,'DAY_OF_ORIGIN'), dep = gt(cells,'DEP_TIME_SCHED'), arr = gt(cells,'ARR_TIME_SCHED');
      if (!legNo || !carrier || !fnNum || !day || !dep || !arr) continue;
      try {
        newLegs.push(new Leg({
          LEG_NO: legNo, FN_CARRIER: carrier, FN_NUMBER: fnNum, DAY_OF_ORIGIN: day,
          FN_SUFFIX: g(cells,'FN_SUFFIX') || '', AC_OWNER: g(cells,'AC_OWNER') || '',
          AC_SUBTYPE: g(cells,'AC_SUBTYPE') || 'Unknown', AC_VERSION: g(cells,'AC_VERSION') || '',
          AC_REGISTRATION: g(cells,'AC_REGISTRATION') || 'N/A',
          DEP_AP_SCHED: g(cells,'DEP_AP_SCHED'), ARR_AP_SCHED: g(cells,'ARR_AP_SCHED'),
          DEP_AP_ACTUAL: g(cells,'DEP_AP_ACTUAL'), ARR_AP_ACTUAL: g(cells,'ARR_AP_ACTUAL'),
          LEG_STATE: g(cells,'LEG_STATE') || 'SCH', LEG_TYPE: g(cells,'LEG_TYPE') || 'PAX',
          DEP_DAY_SCHED: gd(cells,'DEP_DAY_SCHED') || day, DEP_TIME_SCHED: dep,
          ARR_DAY_SCHED: gd(cells,'ARR_DAY_SCHED') || day, ARR_TIME_SCHED: arr,
          DELAY_CODE_01: g(cells,'DELAY_CODE_01'), DELAY_TIME_01: Number(g(cells,'DELAY_TIME_01')) || 0,
          DELAY_CODE_02: g(cells,'DELAY_CODE_02'), DELAY_TIME_02: Number(g(cells,'DELAY_TIME_02')) || 0,
          DELAY_CODE_03: g(cells,'DELAY_CODE_03'), DELAY_TIME_03: Number(g(cells,'DELAY_TIME_03')) || 0,
        }));
      } catch { /* skip bad rows */ }
    }
    if (newLegs.length === 0) { alert('Aucun leg valide dans le fichier.'); return; }
    setLegsData(newLegs);
    setSelectedLeg(null);
  }

  function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
          if (rows.length < 2) return;
          processImportRows(rows[0], rows.slice(1));
        } catch { alert('Erreur lecture fichier Excel.'); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return;
        const hLine = lines[0];
        const semis = (hLine.match(/;/g)||[]).length, commas = (hLine.match(/,/g)||[]).length;
        const delim = semis >= commas ? ';' : ',';
        const header = hLine.split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
        const data = lines.slice(1).map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, '')));
        processImportRows(header, data);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  }

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
          sidebarOpen={sidebarOpen}
          onToggleDark={() => setIsDark(d => !d)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Page content */}
        <div className="page-content">

          {/* ── GANTT PAGE ── */}
          {safePage === "gantt" && (
            <div className="gantt-area">

              {/* Hidden file input for CSV/Excel import */}
              <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileImport} />

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
                onImport={() => importRef.current?.click()}
                legs={legsData}
                viewMode={viewMode}
                onViewChange={setViewMode}
              />

              {/* Timeline or Board */}
              <div className="timeline-container">
                {viewMode === "gantt" ? (
                  <FlightGantt
                    legs={legsData}
                    filters={filters}
                    onSelectLeg={setSelectedLeg}
                    zoom={zoom}
                  />
                ) : (
                  <FlightBoard
                    legs={legsData}
                    filters={filters}
                    onSelectLeg={setSelectedLeg}
                  />
                )}
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
          {safePage === "schedule" && <SchedulePage isDark={isDark} legs={legsData} />}

          {/* ── REPORTS PAGE ── */}
          {safePage === "reports" && <ReportsPage isDark={isDark} legs={legsData} />}

          {/* ── ADMIN PAGE ── */}
          {safePage === "admin" && <AdminPage isDark={isDark} onLegsImported={setLegsData} />}

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
        legs={legsData}
        filters={filters}
      />

    </div>
  );
}

export default App;