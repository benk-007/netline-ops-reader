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
  const { fDate, fService, fDep, fArr, fFlight, fSubtype } = filters || {};

  const toArr = v => Array.isArray(v) ? v : [];

  const filtered = allLegs.filter(leg => {
    const fdArr = toArr(fDate);
    const fsArr = toArr(fService);
    const fdepArr = toArr(fDep);
    const farrArr = toArr(fArr);
    const fstArr = toArr(fSubtype);

    if (fdArr.length > 0 && !fdArr.includes(leg.date)) return false;
    if (fsArr.length > 0 && !fsArr.includes(leg.service)) return false;
    if (fdepArr.length > 0 && !fdepArr.includes(leg.dep)) return false;
    if (farrArr.length > 0 && !farrArr.includes(leg.arr)) return false;
    if (fstArr.length > 0 && !fstArr.includes(leg.subtype)) return false;
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

const MIN_TIME = new Date("2026-03-04T00:00:00").getTime();
const MAX_TIME = new Date("2026-03-07T00:00:00").getTime();

/* Default window: 17h (05:30 → 22:30 on 2026-03-05) */
const BASE_WINDOW_MS = 17 * 3600 * 1000;

export default function FlightGantt({ legs: allLegs, filters, onSelectLeg, zoom = 1 }) {
  const container = useRef(null);
  const timelineRef = useRef(null);
  const filteredRef = useRef([]);

  const scrollContainerRef = useRef(null);
  const scrollContentRef = useRef(null);
  const isSyncingScrollbarRef = useRef(false);
  const isSyncingTimelineRef = useRef(false);

  const [hoveredLeg, setHoveredLeg] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  /* ── Build / rebuild timeline when legs or filters change ── */
  useEffect(() => {
    const { groups, items, filtered } = applyFilters(allLegs, filters || {});
    filteredRef.current = filtered;

    const options = {
      stack: true,
      editable: false,
      zoomable: true,
      horizontalScroll: false,
      verticalScroll: true,
      moveable: true,
      orientation: "top",
      start: "2026-03-05T05:30:00",
      end: "2026-03-05T22:30:00",
      min: new Date(MIN_TIME),
      max: new Date(MAX_TIME),
      timeAxis: { scale: "hour", step: 1 },
      margin: { item: { horizontal: -10, vertical: 3 }, axis: 4 },
      showCurrentTime: true,
    };

    const timeline = new Timeline(container.current, items, groups, options);
    timelineRef.current = timeline;

    const updateScrollbar = () => {
      if (!timelineRef.current || !scrollContainerRef.current || !scrollContentRef.current) return;
      if (isSyncingTimelineRef.current) return;

      isSyncingScrollbarRef.current = true;

      const win = timelineRef.current.getWindow();
      const start = win.start.getTime();
      const end = win.end.getTime();
      const visibleRange = end - start;
      const totalRange = MAX_TIME - MIN_TIME;

      const widthPct = Math.max(100, (totalRange / visibleRange) * 100);
      scrollContentRef.current.style.width = widthPct + "%";

      const scrolledTime = start - MIN_TIME;
      const scrollableTime = totalRange - visibleRange;

      if (scrollableTime > 0) {
        const scrollRatio = scrolledTime / scrollableTime;
        const maxScrollLeft = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
        scrollContainerRef.current.scrollLeft = scrollRatio * maxScrollLeft;
      } else {
        scrollContainerRef.current.scrollLeft = 0;
      }

      requestAnimationFrame(() => { isSyncingScrollbarRef.current = false; });
    };

    timeline.on("rangechange", updateScrollbar);
    timeline.on("rangechanged", updateScrollbar);
    setTimeout(updateScrollbar, 50);

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

  /* ── Zoom prop → setWindow on the timeline ──────────────── */
  useEffect(() => {
    if (!timelineRef.current) return;
    const windowMs = BASE_WINDOW_MS / zoom;
    const win = timelineRef.current.getWindow();
    const center = (win.start.getTime() + win.end.getTime()) / 2;
    timelineRef.current.setWindow(
      Math.max(MIN_TIME, center - windowMs / 2),
      Math.min(MAX_TIME, center + windowMs / 2),
      { animation: { duration: 300, easingFunction: "easeInOutQuad" } }
    );
  }, [zoom]);

  const handleScroll = () => {
    if (!timelineRef.current || !scrollContainerRef.current) return;
    if (isSyncingScrollbarRef.current) return;

    isSyncingTimelineRef.current = true;

    const maxScrollLeft = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
    if (maxScrollLeft > 0) {
      const scrollRatio = scrollContainerRef.current.scrollLeft / maxScrollLeft;
      const currentWindow = timelineRef.current.getWindow();
      const start = currentWindow.start.getTime();
      const end = currentWindow.end.getTime();
      const visibleRange = end - start;
      const totalRange = MAX_TIME - MIN_TIME;
      const scrollableTime = totalRange - visibleRange;
      const newStart = MIN_TIME + scrollRatio * scrollableTime;
      const newEnd = newStart + visibleRange;
      timelineRef.current.setWindow(newStart, newEnd, { animation: false });
    }

    requestAnimationFrame(() => { isSyncingTimelineRef.current = false; });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div ref={container} className="gantt-wrapper" style={{ flex: 1, width: "100%" }} />

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="custom-gantt-scrollbar"
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            width: "100%",
            height: "14px",
            background: "var(--gantt-bg)",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border-2)",
            flexShrink: 0,
          }}
        >
          <div ref={scrollContentRef} style={{ height: "1px", width: "100%" }} />
        </div>

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
