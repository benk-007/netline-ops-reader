import React, { useEffect, useRef, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.css";
import { DataSet } from "vis-data";

import "./gantt.css";
import "./gantt-legend.css";
import FlightCard from "../FlightCard/FlightCard";

/* ── Build netline template for a planned bar ── */
function buildLegTemplate(leg) {
  const container = document.createElement("div");
  container.className = "leg-content";

  const left = document.createElement("span");
  left.className = "leg-dep";
  left.textContent = `${leg.dep} ${leg.depUtc.slice(0, 5)}`;

  const center = document.createElement("span");
  center.className = "leg-flight";
  center.textContent = leg.fn;

  const right = document.createElement("span");
  right.className = "leg-arr";
  right.textContent = `${leg.arrUtc.slice(0, 5)} ${leg.arr}`;

  container.appendChild(left);
  container.appendChild(center);
  container.appendChild(right);

  return container;
}

/* ── Build netline template for an actual bar ── */
function buildActualTemplate(leg, actStart, actEnd) {
  const container = document.createElement("div");
  container.className = "leg-content";

  const left = document.createElement("span");
  left.className = "leg-dep";
  left.textContent = actStart.slice(0, 5);

  const center = document.createElement("span");
  center.className = "leg-flight";
  center.textContent = leg.fn;

  const right = document.createElement("span");
  right.className = "leg-arr";
  right.textContent = actEnd.slice(0, 5);

  container.appendChild(left);
  container.appendChild(center);
  container.appendChild(right);

  return container;
}

// ── Overnight helpers (used by both applyFilters and window strategies) ──

/** "HH:MM[:SS]" → total minutes since midnight. */
function hhmmToMin(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/** ISO date string for the calendar day after dateStr. */
function nextISODay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Given a departure and arrival "HH:MM" on the same base date, return
 * the correct ISO date for the arrival — next day when the clock wraps.
 */
function arrISODate(baseDate, depHHMM, arrHHMM) {
  const depMin = hhmmToMin(depHHMM);
  const arrMin = hhmmToMin(arrHHMM);
  if (depMin !== null && arrMin !== null && arrMin < depMin) return nextISODay(baseDate);
  return baseDate;
}

/** Apply active filters to legs and return filtered groups + items DataSets */
function applyFilters(allLegs, filters) {
  const { fDate, fService, fDep, fArr, fFlight, fSubtype, fReg } = filters || {};

  const toArr = v => Array.isArray(v) ? v : [];

  const filtered = allLegs.filter(leg => {
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

  const uniqueRegs = [...new Set(filtered.map(l => l.reg))];

  /* Groups with subgroup support — planned stacks above actual */
  const groups = new DataSet(
    uniqueRegs.map(reg => ({
      id: reg,
      content: reg,
      subgroupStack: true,
      subgroupOrder: function (a, b) {
        return (a.subgroupOrder || 0) - (b.subgroupOrder || 0);
      },
    }))
  );

  /* Build dual items: planned (blue) + actual (gray) per leg */
  const itemsArr = [];

  filtered.forEach((leg, idx) => {
    const baseId = `f-${idx}-${leg.id}`;
    const isCancelled = leg.state === "Cancelled";
    const isDelayed = leg.state === "Delayed";
    const isBoarding = leg.state === "Boarding";

    /* CSS classes for the planned bar */
    const plannedClasses = [
      "leg-planned",
      `leg-svc-${leg.service}`,
      isCancelled && "leg-cancelled",
      isDelayed && "leg-delayed",
      isBoarding && "leg-boarding",
    ].filter(Boolean).join(" ");

    /* ── PLANNED bar (always created) ── */
    const planEndDate = arrISODate(leg.date, leg.depUtc, leg.arrUtc);
    itemsArr.push({
      id: `${baseId}-plan`,
      group: leg.reg,
      subgroup: "planned",
      subgroupOrder: 0,
      content: buildLegTemplate(leg),
      start: `${leg.date}T${leg.depUtc}:00`,
      end: `${planEndDate}T${leg.arrUtc}:00`,
      className: plannedClasses,
      legId: leg.id,
    });

    /* ── ACTUAL bar (only if actual times exist) ── */
    const actStart = leg.OFF_BLOCK_TIME || leg.AIRBORNE_TIME;
    const actEnd = leg.ON_BLOCK_TIME || leg.LANDING_TIME || leg.arrUtc;

    if (actStart) {
      const actualClasses = [
        "leg-actual",
        `leg-svc-${leg.service}`,
        isDelayed && "leg-delayed",
      ].filter(Boolean).join(" ");

      const actEndDate = arrISODate(leg.date, actStart, actEnd);
      itemsArr.push({
        id: `${baseId}-act`,
        group: leg.reg,
        subgroup: "actual",
        subgroupOrder: 1,
        content: buildActualTemplate(leg, actStart, actEnd),
        start: `${leg.date}T${actStart}:00`,
        end: `${actEndDate}T${actEnd}:00`,
        className: actualClasses,
        legId: leg.id,
      });
    }
  });

  const items = new DataSet(itemsArr);

  return { groups, items, filtered };
}

/* ── Legend entries for the new color scheme ── */
const LEGEND_ENTRIES = [
  { label: "Planifié",    color: "#2563eb" },
  { label: "Actuel",      color: "#6b7280" },
  { label: "Maintenance", color: "#d97706" },
  { label: "F Actuel",    color: "#f9a8d4" },
  { label: "Retardé",     color: "#ef4444" },
  { label: "Annulé",      color: "#374151" },
];

// ─────────────────────────────────────────────────────────────
// Window Strategy Pattern
// ─────────────────────────────────────────────────────────────
//
// Each strategy is a pure function:
//   (referenceDate: string, dayCount: number, legs: Leg[]) => { start: Date, end: Date }
//
// To switch algorithm, pass a different WINDOW_STRATEGIES value
// to FlightGantt via the `windowStrategy` prop.
// ─────────────────────────────────────────────────────────────

/**
 * Convert a leg date + "HH:MM" time to a Date object.
 * Pass nextDay=true when the time wraps past midnight.
 */
function toDateTime(dateStr, hhmm, nextDay = false) {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  if (nextDay) d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Format a Date as "YYYY-MM-DD" using LOCAL calendar values (not UTC). */
function toISODateLocal(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}


/**
 * FIXED strategy — classic 00:00–23:59 window over the reference day(s).
 * Predictable; does not depend on actual flight data.
 */
function fixedDayStrategy(referenceDate, dayCount, _legs) {
  const ref = new Date(referenceDate + "T00:00:00");
  let startDay = new Date(ref);
  let endDay   = new Date(ref);
  if (dayCount === 2) {
    endDay.setDate(endDay.getDate() + 1);
  } else if (dayCount >= 3) {
    startDay.setDate(startDay.getDate() - 1);
    endDay.setDate(endDay.getDate() + 1);
  }
  const start = new Date(startDay); start.setHours(0,  0,  0,   0);
  const end   = new Date(endDay);   end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * DATA_DRIVEN strategy — window is anchored as follows:
 *
 *   1 day  : earliest departure of referenceDate  →  latest arrival of referenceDate
 *   2 days : earliest departure of day 0          →  latest arrival of day +1
 *   3 days : earliest departure of day -1         →  latest arrival of day +1
 *
 * "Latest arrival" accounts for overnight legs: a flight departing at
 * 22:59 and arriving at 02:00 extends the window into the next calendar day.
 *
 * Time precedence:
 *   departure: OFF_BLOCK_TIME > AIRBORNE_TIME > depUtc (STD)
 *   arrival:   ON_BLOCK_TIME  > LANDING_TIME  > arrUtc (STA)
 *
 * Padding: ±20 min so the first/last bar is never flush against the edge.
 * Falls back to fixedDayStrategy when no leg data is available.
 */
function dataDrivenStrategy(referenceDate, dayCount, legs) {
  if (!legs || legs.length === 0) return fixedDayStrategy(referenceDate, dayCount, legs);

  const PAD = 20 * 60 * 1000; // 20 min in ms
  const ref = new Date(referenceDate + "T00:00:00");

  // Resolve the first and last calendar dates of the current view
  let firstDate = referenceDate;
  let lastDate  = referenceDate;

  if (dayCount === 2) {
    const d = new Date(ref); d.setDate(d.getDate() + 1);
    lastDate = toISODateLocal(d);
  } else if (dayCount >= 3) {
    const d0 = new Date(ref); d0.setDate(d0.getDate() - 1);
    firstDate = toISODateLocal(d0);
    const d2 = new Date(ref); d2.setDate(d2.getDate() + 1);
    lastDate  = toISODateLocal(d2);
  }

  // earliest departure  — scoped to firstDate only
  let earliest = null;
  // latest arrival      — scoped to lastDate only (overnight detection applied)
  let latest   = null;

  legs.forEach(leg => {
    const depHHMM = (leg.OFF_BLOCK_TIME || leg.AIRBORNE_TIME || leg.depUtc || "").slice(0, 5);
    const arrHHMM = (leg.ON_BLOCK_TIME  || leg.LANDING_TIME  || leg.arrUtc  || "").slice(0, 5);

    // ── Window START: earliest departure on the first day ──
    if (leg.date === firstDate && depHHMM) {
      const depDt = toDateTime(leg.date, depHHMM);
      if (!earliest || depDt < earliest) earliest = depDt;
    }

    // ── Window END: latest arrival on the last day ──
    if (leg.date === lastDate && arrHHMM && depHHMM) {
      const isOvernight = hhmmToMin(arrHHMM) < hhmmToMin(depHHMM);
      const arrDt = toDateTime(leg.date, arrHHMM, isOvernight);
      if (!latest || arrDt > latest) latest = arrDt;
    }
  });

  // Fallback to day boundaries when no legs exist on the anchor days
  if (!earliest) earliest = toDateTime(firstDate, "00:00");
  if (!latest)   latest   = toDateTime(lastDate,  "23:59");

  return {
    start: new Date(earliest.getTime() - PAD),
    end:   new Date(latest.getTime()   + PAD),
  };
}

/**
 * Registry of window strategies.
 * Import this in any parent component to pass a strategy to FlightGantt:
 *
 *   import { WINDOW_STRATEGIES } from "../Gantt/FlightGantt";
 *   <FlightGantt windowStrategy={WINDOW_STRATEGIES.FIXED_DAY} ... />
 *
 * Default (when prop is omitted): DATA_DRIVEN
 */
export const WINDOW_STRATEGIES = {
  /** Classic fixed 00:00–23:59 day window. */
  FIXED_DAY:   fixedDayStrategy,
  /** Dynamic window based on actual departure / arrival times. */
  DATA_DRIVEN: dataDrivenStrategy,
};

export default function FlightGantt({
  legs: allLegs,
  filters,
  onSelectLeg,
  dayCount = 1,
  referenceDate,
  /** Swap to WINDOW_STRATEGIES.FIXED_DAY to revert to classic 00:00–23:59. */
  windowStrategy = WINDOW_STRATEGIES.DATA_DRIVEN,
}) {
  const container = useRef(null);
  const wrapperRef = useRef(null);
  const timelineRef = useRef(null);
  const filteredRef = useRef([]);
  /** Always holds the latest strategy so navigation useEffect never goes stale. */
  const strategyRef = useRef(windowStrategy);
  useEffect(() => { strategyRef.current = windowStrategy; }, [windowStrategy]);

  const [hoveredLeg, setHoveredLeg] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  /* ── Dynamic row height / font scaling via ResizeObserver ── */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function applyScale(width) {
      // Planned bar: 16px (narrow) → 22px (wide). Keep bars compact & readable.
      const itemH    = Math.round(Math.min(22, Math.max(16, 16 + (width - 900) * 0.007)));
      // Actual bar: slightly shorter than planned
      const itemActH = Math.round(Math.min(18, Math.max(13, 13 + (width - 900) * 0.005)));
      const fs       = itemH <= 18 ? "9px" : "10px";
      el.style.setProperty("--gantt-item-h",    `${itemH}px`);
      el.style.setProperty("--gantt-item-act-h", `${itemActH}px`);
      el.style.setProperty("--gantt-item-fs",    fs);
    }

    const ro = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? el.offsetWidth;
      applyScale(width);
    });
    ro.observe(el);
    applyScale(el.offsetWidth); // initial
    return () => ro.disconnect();
  }, []);

  const itemsRef = useRef(null);
  const dayCountRef = useRef(dayCount);
  const refDateRef = useRef(referenceDate);

  /* ── Build / rebuild timeline only when DATA or FILTERS change ── */
  useEffect(() => {
    const { groups, items, filtered } = applyFilters(allLegs, filters || {});
    filteredRef.current = filtered;
    itemsRef.current = items;

    const win = strategyRef.current(refDateRef.current, dayCountRef.current, filtered);
    const TIME_STEPS = { 1: 1, 2: 2, 3: 3 };
    const timeStep = TIME_STEPS[dayCountRef.current] || 1;

    const options = {
      stack: true,
      editable: false,
      zoomable: true,
      horizontalScroll: true,
      verticalScroll: true,
      moveable: false,
      orientation: "top",
      start: win.start,
      end: win.end,
      timeAxis: { scale: "hour", step: timeStep },
      margin: { item: { horizontal: -10, vertical: 3 }, axis: 4 },
      showCurrentTime: true,
    };

    const timeline = new Timeline(container.current, items, groups, options);
    timelineRef.current = timeline;

    timeline.on("itemover", (props) => {
      const item = items.get(props.item);
      if (!item) return;
      const leg = filteredRef.current.find(l => l.id === item.legId);
      if (leg) setHoveredLeg(leg);
    });

    timeline.on("itemout", () => setHoveredLeg(null));

    timeline.on("click", (props) => {
      if (!props.item) { onSelectLeg(null); return; }
      const item = items.get(props.item);
      if (!item) return;
      const leg = filteredRef.current.find(l => l.id === item.legId);
      if (leg) onSelectLeg(leg);
    });

    return () => {
      timeline.destroy();
      timelineRef.current = null;
    };
  }, [allLegs, filters]);

  /* ── Smoothly move the visible window when navigating days ── */
  useEffect(() => {
    dayCountRef.current = dayCount;
    refDateRef.current = referenceDate;
    if (!timelineRef.current) return;

    const win = strategyRef.current(referenceDate, dayCount, filteredRef.current);
    const TIME_STEPS = { 1: 1, 2: 2, 3: 3 };
    const timeStep = TIME_STEPS[dayCount] || 1;

    timelineRef.current.setOptions({ timeAxis: { scale: "hour", step: timeStep } });
    timelineRef.current.setWindow(win.start, win.end, { animation: { duration: 300, easingFunction: "easeInOutQuad" } });
  }, [dayCount, referenceDate]);

  return (
    <div ref={wrapperRef} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div ref={container} className="gantt-wrapper" style={{ flex: 1, width: "100%" }} />

        {hoveredLeg && (
          <div
            className="hover-card-container"
            style={{
              position: "fixed",
              top: mousePos.y + 20,
              left: mousePos.x + 20,
              zIndex: 10000,
              pointerEvents: "none",
            }}
          >
            <FlightCard leg={hoveredLeg} />
          </div>
        )}
      </div>

      <div className="gantt-legend">
        {LEGEND_ENTRIES.map(({ label, color }) => (
          <div key={label} className="gantt-legend-item">
            <div className="gantt-legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
