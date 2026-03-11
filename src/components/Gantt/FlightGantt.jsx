import React, { useEffect, useRef, useState, useCallback } from "react";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.css";
import { DataSet } from "vis-data";
import { SERVICE_COLORS } from "../../constants/ganttConstants";

import "./gantt.css";
import "./gantt-legend.css";
import FlightCard from "../FlightCard/FlightCard";
function buildLegTemplate(leg) {

  const container = document.createElement("div")
  container.className = "leg-content"

  const left = document.createElement("span")
  left.className = "leg-dep"
  left.textContent = `${leg.dep} ${leg.depUtc.slice(0, 5)}`

  const center = document.createElement("span")
  center.className = "leg-flight"
  center.textContent = leg.fn

  const right = document.createElement("span")
  right.className = "leg-arr"
  right.textContent = `${leg.arrUtc.slice(0, 5)} ${leg.arr}`

  container.appendChild(left)
  container.appendChild(center)
  container.appendChild(right)

  return container
}
/** Apply active filters to legs and return filtered groups + items DataSets */
function applyFilters(allLegs, filters) {
  const { fDate, fService, fDep, fArr, fFlight, fSubtype } = filters || {};

  const filtered = allLegs.filter(leg => {
    if (fDate && fDate !== "Tous" && fDate !== "Toutes dates" && leg.date !== fDate) return false;
    if (fService && fService !== "Tous" && leg.service !== fService) return false;
    if (fDep && fDep !== "Tous" && leg.dep !== fDep) return false;
    if (fArr && fArr !== "Tous" && leg.arr !== fArr) return false;
    if (fSubtype && fSubtype !== "Tous types" && leg.subtype !== fSubtype) return false;
    if (fFlight && !leg.fn.toLowerCase().includes(fFlight.toLowerCase())) return false;
    return true;
  });

  const uniqueRegs = [...new Set(filtered.map(l => l.reg))];

  const groups = new DataSet(
    uniqueRegs.map(reg => ({ id: reg, content: reg }))
  );

  const items = new DataSet(
    filtered.map((leg, idx) => {
      // NetLine inspired content: compact but data-rich


      return {
        id: `f-${idx}-${leg.id}`,
        group: leg.reg,
        content: buildLegTemplate(leg),
        start: `${leg.date}T${leg.depUtc}:00`,
        end: `${leg.date}T${leg.arrUtc}:00`,
        className: `svc-${leg.service}`,
        legId: leg.id,
      };
    })
  );

  return { groups, items, filtered };
}

const LEGEND_SERVICES = Object.entries(SERVICE_COLORS).map(([label, colors]) => ({
  label,
  color: colors.bar,
}));

const MIN_TIME = new Date("2026-03-04T00:00:00").getTime();
const MAX_TIME = new Date("2026-03-07T00:00:00").getTime();

export default function FlightGantt({ legs: allLegs, filters, onSelectLeg }) {
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
    const handleMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);


  useEffect(() => {
    const { groups, items, filtered } = applyFilters(allLegs, filters || {});
    filteredRef.current = filtered;

    const options = {
      stack: true,
      editable: false,
      zoomable: true,
      visibleFrameTemplate: null,   // ← disable sticky frame
      horizontalScroll: false,
      verticalScroll: true,
      moveable: true,
      orientation: "top",
      start: "2026-03-05T05:30:00",
      end: "2026-03-05T22:30:00",
      min: new Date(MIN_TIME),
      max: new Date(MAX_TIME),
      timeAxis: { scale: "hour", step: 1 },
      margin: { item: { horizontal: -10, vertical: 6 }, axis: 4 },
      showCurrentTime: true,
    };

    const timeline = new Timeline(container.current, items, groups, options);
    timelineRef.current = timeline;
    timeline.on("rangechanged", (props) => {
      try {
        const level = computeZoomLevel(props);
        setZoomLevel(level);
      } catch (err) { }
    });

    const updateScrollbar = () => {
      if (!timelineRef.current || !scrollContainerRef.current || !scrollContentRef.current) return;
      if (isSyncingTimelineRef.current) return;

      isSyncingScrollbarRef.current = true;

      const window = timelineRef.current.getWindow();
      const start = window.start.getTime();
      const end = window.end.getTime();
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

      requestAnimationFrame(() => {
        isSyncingScrollbarRef.current = false;
      });
    };

    timeline.on("rangechange", updateScrollbar);
    timeline.on("rangechanged", updateScrollbar);

    // Initial sync
    setTimeout(updateScrollbar, 50);

    timeline.on("itemover", (props) => {
      const item = items.get(props.item);
      if (!item) return;

      const leg = filteredRef.current.find(l => l.id === item.legId);

      if (leg && hoveredLeg?.id !== leg.id) {
        setHoveredLeg(leg);
      }
    });

    timeline.on("itemout", () => setHoveredLeg(null));

    timeline.on("click", (props) => {
      if (!props.item) {
        onSelectLeg(null);
        return;
      }
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

  const CARD_OFFSET_X = 20;
  const CARD_OFFSET_Y = 20;

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

    requestAnimationFrame(() => {
      isSyncingTimelineRef.current = false;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div ref={container} className="gantt-wrapper" style={{ flex: 1, width: "100%" }} />

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
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
          className="custom-gantt-scrollbar"
        >
          <div ref={scrollContentRef} style={{ height: "1px", width: "100%" }} />
        </div>

        {hoveredLeg && (
          <div
            className="hover-card-container"
            style={{
              position: "fixed",
              top: mousePos.y + CARD_OFFSET_Y,
              left: mousePos.x + CARD_OFFSET_X,
              zIndex: 10000,
              pointerEvents: "none",
            }}
          >
            <FlightCard leg={hoveredLeg} />
          </div>
        )}
      </div>
      <div className="gantt-legend">
        {LEGEND_SERVICES.map(({ label, color }) => (
          <div key={label} className="gantt-legend-item">
            <div className="gantt-legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}