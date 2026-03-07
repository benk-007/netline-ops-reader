import React, { useEffect, useRef, useState, useCallback } from "react";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.css";
import { DataSet } from "vis-data";
import { SERVICE_COLORS } from "../../constants/ganttConstants";

import "./gantt.css";
import "./gantt-legend.css";
import FlightCard from "../FlightCard/FlightCard";

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
      const content = `
        <div class="leg-content">
          <div class="leg-top-row">
            <span class="leg-fn">${leg.fn}</span>
            <span class="leg-route">${leg.dep}→${leg.arr}</span>
          </div>
          <div class="leg-bottom-row">
            <span class="leg-times">${leg.depUtc.slice(0, 5)} - ${leg.arrUtc.slice(0, 5)}</span>
            <span class="leg-subtype">${leg.subtype}</span>
          </div>
        </div>
      `;

      return {
        id: `f-${idx}-${leg.id}`,
        group: leg.reg,
        content: content,
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

export default function FlightGantt({ legs: allLegs, filters, onSelectLeg }) {
  const container = useRef(null);
  const timelineRef = useRef(null);
  const filteredRef = useRef([]);

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
      horizontalScroll: true,
      verticalScroll: true,
      moveable: true,
      orientation: "top",
      start: "2026-03-05T05:30:00",
      end: "2026-03-05T22:30:00",
      min: "2026-03-04T00:00:00",
      max: "2026-03-07T00:00:00",
      timeAxis: { scale: "hour", step: 1 },
      margin: { item: { horizontal: 4, vertical: 6 }, axis: 4 },
      showCurrentTime: true,
    };

    const timeline = new Timeline(container.current, items, groups, options);
    timelineRef.current = timeline;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div ref={container} className="gantt-wrapper" style={{ height: "100%", width: "100%" }} />
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