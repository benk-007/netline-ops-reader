import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { STATE_COLORS, getServiceColor } from "../../constants/ganttConstants";
import "./FlightBoard.css";

const STATUS_ORDER = ["Airborne", "Boarding", "Delayed", "Scheduled", "Arrived", "Cancelled"];

function PlaneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function SortIcon({ dir }) {
  if (!dir) return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
    </svg>
  );
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {dir === "asc" ? <path d="M7 15l5 5 5-5" /> : <path d="M7 9l5-5 5 5" />}
    </svg>
  );
}

export default function FlightBoard({ legs = [], filters, onSelectLeg }) {
  const [sortKey, setSortKey] = useState("depUtc");
  const [sortDir, setSortDir] = useState("asc");
  const [groupBy, setGroupBy] = useState("status"); // "status" | "aircraft" | "none"
  const [selected, setSelected] = useState(new Set()); // Set of leg IDs

  // Apply same filters as Gantt
  const filtered = useMemo(() => {
    const { fDate, fService, fDep, fArr, fFlight, fSubtype, fReg } = filters || {};
    const toArr = v => Array.isArray(v) ? v : [];

    return (legs || []).filter(leg => {
      const fdArr = toArr(fDate);
      const fsArr = toArr(fService);
      const fdepArr = toArr(fDep);
      const farrArr = toArr(fArr);
      const fstArr = toArr(fSubtype);
      const fregArr = toArr(fReg);

      if (fdArr.length > 0 && !fdArr.includes(leg.date)) return false;
      if (fsArr.length > 0 && !fsArr.includes(leg.service)) return false;
      if (fdepArr.length > 0 && !fdepArr.includes(leg.dep)) return false;
      if (farrArr.length > 0 && !farrArr.includes(leg.arr)) return false;
      if (fstArr.length > 0 && !fstArr.includes(leg.subtype)) return false;
      if (fregArr.length > 0 && !fregArr.includes(leg.reg)) return false;
      if (fFlight && !leg.fn.toLowerCase().includes(fFlight.toLowerCase())) return false;
      return true;
    });
  }, [legs, filters]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va = a[sortKey] ?? "";
      let vb = b[sortKey] ?? "";
      if (sortKey === "delay") { va = Number(va) || 0; vb = Number(vb) || 0; }
      if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Group
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: `Tous les vols (${sorted.length})`, items: sorted }];

    const map = new Map();
    sorted.forEach(leg => {
      const key = groupBy === "status" ? (leg.state || "Unknown") : (leg.reg || "Unknown");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(leg);
    });

    const entries = [...map.entries()];
    if (groupBy === "status") {
      entries.sort((a, b) => {
        const ia = STATUS_ORDER.indexOf(a[0]);
        const ib = STATUS_ORDER.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return entries.map(([key, items]) => ({ key, label: `${key} (${items.length})`, items }));
  }, [sorted, groupBy]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allSortedIds = useMemo(() => sorted.map(l => l.id ?? l.LEG_NO), [sorted]);
  const allSelected = allSortedIds.length > 0 && allSortedIds.every(id => selected.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allSortedIds));
    }
  }

  function exportSelected() {
    const rows = sorted.filter(l => selected.has(l.id ?? l.LEG_NO));
    const data = [
      ["Vol", "Dep", "Arr", "Dep UTC", "Arr UTC", "Immat", "Type", "Service", "Statut", "Retard", "Date"],
      ...rows.map(l => [l.fn, l.dep, l.arr, l.depUtc, l.arrUtc, l.reg, l.subtype, l.service, l.state, l.delay || 0, l.date]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Legs");
    XLSX.writeFile(wb, `legs_selection_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const columns = [
    { key: "fn", label: "Vol", width: "90px" },
    { key: "dep", label: "Dep", width: "60px" },
    { key: "arr", label: "Arr", width: "60px" },
    { key: "depUtc", label: "Dep UTC", width: "70px" },
    { key: "arrUtc", label: "Arr UTC", width: "70px" },
    { key: "reg", label: "Immat", width: "90px" },
    { key: "subtype", label: "Type", width: "85px" },
    { key: "service", label: "Service", width: "80px" },
    { key: "state", label: "Statut", width: "90px" },
    { key: "delay", label: "Retard", width: "70px" },
    { key: "date", label: "Date", width: "90px" },
  ];

  return (
    <div className="flight-board">
      {/* Toolbar */}
      <div className="fb-toolbar">
        <div className="fb-toolbar-left">
          <PlaneIcon />
          <span className="fb-count">{filtered.length} flight{filtered.length !== 1 ? "s" : ""}</span>
          {selected.size > 0 && (
            <>
              <span className="fb-sel-count">{selected.size} selected</span>
              <button className="fb-export-sel-btn" onClick={exportSelected} title="Export selected to xlsx">
                ↓ Export selected
              </button>
              <button className="fb-clear-sel-btn" onClick={() => setSelected(new Set())} title="Clear selection">×</button>
            </>
          )}
        </div>
        <div className="fb-toolbar-right">
          <span className="fb-group-label">Group by</span>
          <div className="fb-group-pills">
            {[
              { v: "status", l: "Status" },
              { v: "aircraft", l: "Aircraft" },
              { v: "none", l: "None" },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`fb-pill ${groupBy === v ? "fb-pill--active" : ""}`}
                onClick={() => setGroupBy(v)}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="fb-table-wrap">
        <table className="fb-table">
          <thead>
            <tr>
              <th style={{ width: 32, minWidth: 32 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  title="Select all"
                  aria-label="Select all"
                />
              </th>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  onClick={() => handleSort(col.key)}
                  className={sortKey === col.key ? "fb-th--active" : ""}
                >
                  <span>{col.label}</span>
                  <SortIcon dir={sortKey === col.key ? sortDir : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <GroupRows
                key={group.key}
                group={group}
                groupBy={groupBy}
                onSelectLeg={onSelectLeg}
                selected={selected}
                onToggleSelect={toggleSelect}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="fb-empty">No flights match the current filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({ group, groupBy, onSelectLeg, selected, onToggleSelect }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {groupBy !== "none" && (
        <tr className="fb-group-header" onClick={() => setCollapsed(c => !c)}>
          <td colSpan={12}>
            <span className={`fb-group-chevron ${collapsed ? "fb-group-chevron--collapsed" : ""}`}>&#9662;</span>
            <span className="fb-group-title">
              {groupBy === "status" && (
                <span className="fb-status-dot" style={{ background: STATE_COLORS[group.key] || "#64748b" }} />
              )}
              {group.label}
            </span>
          </td>
        </tr>
      )}
      {!collapsed && group.items.map((leg, i) => (
        <FlightRow
          key={leg.id ?? i}
          leg={leg}
          onClick={() => onSelectLeg(leg)}
          isSelected={selected.has(leg.id ?? leg.LEG_NO)}
          onToggleSelect={(e) => { e.stopPropagation(); onToggleSelect(leg.id ?? leg.LEG_NO); }}
        />
      ))}
    </>
  );
}

function FlightRow({ leg, onClick, isSelected, onToggleSelect }) {
  const sc = getServiceColor(leg.service);
  const stateColor = STATE_COLORS[leg.state] || "#64748b";

  return (
    <tr className={`fb-row${isSelected ? " fb-row--selected" : ""}`} onClick={onClick}>
      <td onClick={onToggleSelect} style={{ cursor: "default" }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={e => e.stopPropagation()}
          aria-label="Select row"
        />
      </td>
      <td className="fb-cell-fn" style={{ color: sc.bar }}>{leg.fn}</td>
      <td>{leg.dep}</td>
      <td>{leg.arr}</td>
      <td className="fb-cell-mono">{leg.depUtc}</td>
      <td className="fb-cell-mono">{leg.arrUtc}</td>
      <td className="fb-cell-mono">{leg.reg}</td>
      <td>{leg.subtype}</td>
      <td>
        <span className="fb-svc-badge" style={{ color: sc.text, background: sc.bg }}>{leg.service}</span>
      </td>
      <td>
        <span className="fb-state-badge" style={{ color: stateColor, background: `${stateColor}18`, borderColor: `${stateColor}40` }}>
          {leg.state}
        </span>
      </td>
      <td className={`fb-cell-delay ${leg.delay > 0 ? "fb-delay-pos" : ""}`}>
        {leg.delay > 0 ? `+${leg.delay}` : "—"}
      </td>
      <td className="fb-cell-mono">{leg.date}</td>
    </tr>
  );
}
