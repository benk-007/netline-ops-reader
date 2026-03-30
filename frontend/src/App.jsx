/**
 * Root Application Component — Netline Reader
 *
 * Handles:
 *  - Authentication via Keycloak (with mock login fallback)
 *  - Role-based page access (admin, staff_ops, chef_escale)
 *  - Flight data state (default mock data + CSV/Excel import)
 *  - Filter state, zoom, profiles, export modals
 *  - Dark/light theme, UTC mode
 */
import "./App.css";
import { useState, useEffect } from "react";
// import { useRef } from "react";  // re-enable when Gantt import is re-activated
// import * as XLSX from "xlsx";    // re-enable when Gantt import is re-activated

/* ── Auth ── */
import { getUserInfo, logout as keycloakLogout, getKeycloak } from "./auth";
import { meApi } from "./api";

/* ── Components ── */
import GanttBottomPanel from "./components/BottomBar/GanttBottomPanel";
import GanttTopbar from "./components/TopBar/GanttTopbar";
import FlightGantt from "./components/Gantt/FlightGantt";
import StationGantt from "./components/Gantt/StationGantt";
import GanttFilterBar from "./components/Filters/GanttFilterBar";
// import ImportFeedback from "./components/Filters/ImportFeedback"; // re-enable when Gantt import is re-activated
import SideMenu from "./components/Menu/SideMenu";
import ProfileManager from "./components/Profiles/ProfileManager";
import ExportModal from "./components/Export/ExportModal";
import FlightBoard from "./components/FlightBoard/FlightBoard";

/* ── Pages ── */
import SchedulePage from "./components/pages/SchedulePage";
import ReportsPage from "./components/pages/ReportsPage";
import AdminPage from "./components/pages/AdminPage";
import LoginPage from "./components/Auth/LoginPage";

/* ── Data ── */
import { legs as defaultLegs } from "./data/flightsData";
// import { Leg } from "./data/flightsData";         // re-enable when Gantt import is re-activated
// import { normalizeDate, normalizeTime } from "./utils/dateUtils"; // re-enable when Gantt import is re-activated

/* ── Role-based access control ──
 * Maps each role to the pages it can see.
 * This is the frontend guard — the backend enforces RBAC via JWT roles.
 */
const ROLE_PAGES = {
  admin:       ["gantt", "schedule", "reports", "admin"],
  staff_ops:   ["gantt", "schedule", "reports"],
  chef_escale: ["gantt", "schedule", "reports"],
  aol_agent:   ["reports"],
};

const ROLE_DEFAULT_PAGE = {
  admin:       "gantt",
  staff_ops:   "gantt",
  chef_escale: "gantt",
  aol_agent:   "reports",
};

/* ═══════════════════════════════════════════════════════════ */

function App({ keycloakFailed }) {
  /* ── Flight data state (can be replaced via CSV upload in Admin) ── */
  const [legsData, setLegsData] = useState(defaultLegs);

  /* ── Auth state ── */
  const [currentUser, setCurrentUser] = useState(() => {
    // If Keycloak initialized successfully, extract user from token
    if (!keycloakFailed) {
      const user = getUserInfo();
      if (user) return user;
    }
    return null;
  });

  /* ── Layout state ── */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const user = !keycloakFailed ? getUserInfo() : null;
    return user ? (ROLE_DEFAULT_PAGE[user.role] ?? "gantt") : "gantt";
  });

  /* ── UI state ── */
  const [selectedLeg, setSelectedLeg] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const [utcMode, setUtcMode] = useState(true);

  /* Sync theme with document */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  /* Auto-provision DB user on first Keycloak login and fetch assignedAirports */
  useEffect(() => {
    if (currentUser && !keycloakFailed) {
      meApi.get()
        .then(me => {
          if (me?.assignedAirports) {
            setCurrentUser(u => u ? { ...u, assignedAirports: me.assignedAirports } : u);
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.name, keycloakFailed]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Day navigation state for Gantt ── */
  const [dayCount, setDayCount] = useState(1);       // 1, 2, or 3 days visible
  const [referenceDate, setReferenceDate] = useState(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm   = String(t.getMonth() + 1).padStart(2, "0");
    const dd   = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  function shiftDays(offset) {
    const d = new Date(referenceDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    // Format as YYYY-MM-DD using local values (NOT toISOString which converts to UTC)
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    const next = `${yyyy}-${mm}-${dd}`;
    setReferenceDate(next);
  }

  function resetToToday() {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm   = String(t.getMonth() + 1).padStart(2, "0");
    const dd   = String(t.getDate()).padStart(2, "0");
    setReferenceDate(`${yyyy}-${mm}-${dd}`);
  }

  const [showProfiles, setShowProfiles] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState("gantt");
  /* ── Gantt import disabled — re-enable block below when needed ──────────
  const [importFeedback, setImportFeedback] = useState({ message: '', type: null });
  const importRef = useRef(null);

  function processImportRows(headerRow, dataRows) {
    const colIdx = {};
    headerRow.forEach((h, i) => { colIdx[String(h).trim().toUpperCase()] = i; });
    const required = ['LEG_NO','FN_CARRIER','FN_NUMBER','DEP_AP_SCHED','ARR_AP_SCHED','DEP_TIME_SCHED','ARR_TIME_SCHED','DAY_OF_ORIGIN'];
    const missing = required.filter(c => colIdx[c] === undefined);
    if (missing.length > 0) { setImportFeedback({ message: `Colonnes manquantes: ${missing.join(', ')}`, type: 'error' }); return; }
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
      } catch { }
    }
    if (newLegs.length === 0) { setImportFeedback({ message: 'Aucun leg valide dans le fichier.', type: 'error' }); return; }
    setLegsData(newLegs);
    setSelectedLeg(null);
    setImportFeedback({ message: `${newLegs.length} leg${newLegs.length > 1 ? 's' : ''} importé${newLegs.length > 1 ? 's' : ''} avec succès`, type: 'success' });
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
  ─────────────────────────────────────────────────────────────────────── */

  /* ── Filter state — all dropdowns are string[], [] = show all ── */
  const [filters, setFilters] = useState({
    fDate:    [],
    fService: [],
    fDep:     [],
    fArr:     [],
    fFlight:  "",
    fSubtype: [],
  });

  function changeFilter(newFilters) {
    setFilters(newFilters);
    setSelectedLeg(null);
  }

  function handleLoadProfile(profile) {
    if (profile.filters) setFilters(profile.filters);
    if (typeof profile.utcMode === "boolean") setUtcMode(profile.utcMode);
    if (typeof profile.dayCount === "number") setDayCount(profile.dayCount);
  }

  /* ── Auth handlers ── */
  function handleLogin(user) {
    // Used only in mock login fallback mode
    setCurrentUser(user);
    setCurrentPage(ROLE_DEFAULT_PAGE[user.role]);
    setSelectedLeg(null);
  }

  function handleLogout() {
    // If Keycloak is active, use its logout (redirects to Keycloak)
    if (!keycloakFailed && getKeycloak().authenticated) {
      keycloakLogout();
      return;
    }
    // Mock fallback logout
    setCurrentUser(null);
    setCurrentPage("gantt");
    setSelectedLeg(null);
    setSidebarOpen(false);
  }

  /* ── Navigation with role guard ── */
  function handleNavigate(page) {
    if (!currentUser) return;
    const allowed = ROLE_PAGES[currentUser.role] ?? [];
    if (!allowed.includes(page)) return;
    setCurrentPage(page);
    setSelectedLeg(null);
  }

  /* Ensure currentPage is always valid for the user's role */
  const allowedPages = currentUser ? (ROLE_PAGES[currentUser.role] ?? []) : [];
  const safePage = allowedPages.includes(currentPage)
    ? currentPage
    : (ROLE_DEFAULT_PAGE[currentUser?.role] ?? "gantt");

  /* ── Show login screen when not authenticated ── */
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-root">

      {/* ── Side Menu ── */}
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

      {/* ── Main Content ── */}
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
              {/* ImportFeedback — re-enable when Gantt import is re-activated
              <ImportFeedback
                message={importFeedback.message}
                type={importFeedback.type}
                onDismiss={() => setImportFeedback({ message: '', type: null })}
              />
              <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileImport} />
              */}

              <GanttFilterBar
                filters={filters}
                onChange={changeFilter}
                dayCount={dayCount}
                onDayCountChange={setDayCount}
                referenceDate={referenceDate}
                onShiftDays={shiftDays}
                onResetToToday={resetToToday}
                onOpenProfiles={() => setShowProfiles(true)}
                onOpenExport={() => setShowExport(true)}
                // onImport={() => importRef.current?.click()} // re-enable when Gantt import is re-activated
                legs={legsData}
                viewMode={viewMode}
                onViewChange={setViewMode}
                hideFilters={currentUser?.role === 'chef_escale'}
              />

              <div className="timeline-container">
                {viewMode === "gantt" ? (
                  currentUser.role === 'chef_escale'
                    ? <StationGantt legs={legsData} userAirports={currentUser.assignedAirports || ["CMN"]} filters={filters} onSelectLeg={setSelectedLeg} dayCount={dayCount} referenceDate={referenceDate} />
                    : <FlightGantt legs={legsData} filters={filters} onSelectLeg={setSelectedLeg} dayCount={dayCount} referenceDate={referenceDate} />
                ) : (
                  <FlightBoard legs={legsData} filters={filters} onSelectLeg={setSelectedLeg} />
                )}
              </div>

              <GanttBottomPanel leg={selectedLeg} onClose={() => setSelectedLeg(null)} isDark={isDark} />
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

      {/* ── Profile Manager Modal ── */}
      <ProfileManager
        isOpen={showProfiles}
        onClose={() => setShowProfiles(false)}
        currentFilters={filters}
        utcMode={utcMode}
        dayCount={dayCount}
        onLoadProfile={handleLoadProfile}
      />

      {/* ── Export Modal ── */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        legs={legsData}
        filters={filters}
        referenceDate={referenceDate}
        dayCount={dayCount}
      />
    </div>
  );
}

export default App;
