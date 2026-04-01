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
    itemsArr.push({
      id: `${baseId}-plan`,
      group: leg.reg,
      subgroup: "planned",
      subgroupOrder: 0,
      content: buildLegTemplate(leg),
      start: `${leg.date}T${leg.depUtc}:00`,
      end: `${leg.date}T${leg.arrUtc}:00`,
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

      itemsArr.push({
        id: `${baseId}-act`,
        group: leg.reg,
        subgroup: "actual",
        subgroupOrder: 1,
        content: buildActualTemplate(leg, actStart, actEnd),
        start: `${leg.date}T${actStart}:00`,
        end: `${leg.date}T${actEnd}:00`,
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

/** Compute the visible date window from dayCount + referenceDate.
 *  - 1 day: just referenceDate (00:00 → 23:59)
 *  - 2 days: referenceDate .. referenceDate + 1  (today + tomorrow)
 *  - 3 days: referenceDate - 1 .. referenceDate + 1  (yesterday + today + tomorrow)
 *
 *  Scroll arrows shift referenceDate by ±1 day, translating the entire window.
 */
function computeWindow(referenceDate, dayCount) {
  const ref = new Date(referenceDate + "T00:00:00");
  let startDay, endDay;
  if (dayCount === 1) {
    startDay = new Date(ref);
    endDay = new Date(ref);
  } else if (dayCount === 2) {
    // today + tomorrow
    startDay = new Date(ref);
    endDay = new Date(ref);
    endDay.setDate(endDay.getDate() + 1);
  } else {
    // yesterday + today + tomorrow
    startDay = new Date(ref);
    startDay.setDate(startDay.getDate() - 1);
    endDay = new Date(ref);
    endDay.setDate(endDay.getDate() + 1);
  }
  const windowStart = new Date(startDay);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(endDay);
  windowEnd.setHours(23, 59, 59, 999);
  return {
    start: windowStart,
    end: windowEnd,
  };
}

export default function FlightGantt({ legs: allLegs, filters, onSelectLeg, dayCount = 1, referenceDate }) {
  const container = useRef(null);
  const wrapperRef = useRef(null);
  const timelineRef = useRef(null);
  const filteredRef = useRef([]);

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
      // Scale item height linearly: 20px at 800px width, 32px at 1600px+
      const itemH = Math.round(Math.min(32, Math.max(18, 18 + (width - 800) * 0.018)));
      const itemActH = Math.round(itemH * 0.75);
      const fs = itemH <= 20 ? "9px" : itemH <= 26 ? "10px" : "11px";
      el.style.setProperty("--gantt-item-h",     `${itemH}px`);
      el.style.setProperty("--gantt-item-act-h",  `${itemActH}px`);
      el.style.setProperty("--gantt-item-fs",     fs);
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

    const win = computeWindow(refDateRef.current, dayCountRef.current);
    const TIME_STEPS = { 1: 1, 2: 2, 3: 3 };
    const timeStep = TIME_STEPS[dayCountRef.current] || 1;

    const options = {
      stack: true,
      editable: false,
      zoomable: false,
      horizontalScroll: false,
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

    const win = computeWindow(referenceDate, dayCount);
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
