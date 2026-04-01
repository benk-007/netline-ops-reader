// ─── GANTT CONSTANTS & HELPERS ───────────────────────────────────────────────

export const DAY_START_H = 0;     // Start at 00:00
export const TOTAL_HOURS = 72;    // 3 days (yesterday, today, tomorrow)
export const HEADER_H = 48;
export const LABEL_W = 180;

export const SERVICE_COLORS = {
  /* Named service types */
  PAX:         { bar: "#2563eb", bg: "rgba(37,99,235,0.15)",   text: "#93c5fd"  },
  Charter:     { bar: "#7c3aed", bg: "rgba(124,58,237,0.15)",  text: "#c4b5fd"  },
  Cargo:       { bar: "#0891b2", bg: "rgba(8,145,178,0.15)",   text: "#67e8f9"  },
  Ferry:       { bar: "#059669", bg: "rgba(5,150,105,0.15)",   text: "#6ee7b7"  },
  Maintenance: { bar: "#d97706", bg: "rgba(217,119,6,0.15)",   text: "#fcd34d"  },
  /* IATA LEG_TYPE codes */
  J:           { bar: "#3b82f6", bg: "rgba(59,130,246,0.15)",  text: "#93c5fd"  },
  F:           { bar: "#0e7490", bg: "rgba(14,116,144,0.15)",  text: "#67e8f9"  },
  P:           { bar: "#059669", bg: "rgba(5,150,105,0.15)",   text: "#6ee7b7"  },
  O:           { bar: "#f97316", bg: "rgba(249,115,22,0.15)",  text: "#fdba74"  },
  S:           { bar: "#8b5cf6", bg: "rgba(139,92,246,0.15)",  text: "#c4b5fd"  },
  VJ:          { bar: "#ec4899", bg: "rgba(236,72,153,0.15)",  text: "#f9a8d4"  },
};

/** Fallback for unknown service types */
export const DEFAULT_SERVICE_COLOR = { bar: "#6366f1", bg: "rgba(99,102,241,0.15)", text: "#a5b4fc" };

/** Get service color, with fallback */
export function getServiceColor(serviceType) {
  return SERVICE_COLORS[serviceType] || DEFAULT_SERVICE_COLOR;
}

export const STATE_COLORS = {
  Arrived: "#22c55e",
  Airborne: "#3b82f6",
  Boarding: "#f59e0b",
  Delayed: "#ef4444",
  Scheduled: "#64748b",
  Cancelled: "#6b7280",
};

export const SUBTYPE_OPTIONS = [
  "Tous types",
  "B737-800",
  "B737-700",
  "B787-9",
  "B787-8",
  "ATR72-600",
  "A320",
  "A321",
];

/** 
 * Helper to get day offset relative to "today" 
 * "2026-02-26" is our base today for the mock data
 */
const BASE_DATE = new Date("2026-03-05T00:00:00Z");

export function getDayOffset(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const diffTime = d.getTime() - BASE_DATE.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/** Convert "HH:MM" + dateStr → fraction of the 3-day window */
export function timeToFrac(hhmm, dateStr) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  const dayOffset = getDayOffset(dateStr); // -1, 0, 1

  // Total hours from start of "yesterday" (BASE_DATE - 1 day)
  // Our window starts at BASE_DATE - 1 day (offset -1)
  const totalHoursFromWindowStart = (dayOffset + 1) * 24 + h + m / 60;
  return totalHoursFromWindowStart / TOTAL_HOURS;
}

/** Compute now fraction within the 3-day window */
export function nowFraction() {
  const now = new Date("2026-03-05T11:00:00Z"); // Fixed mock "now" for consistency
  const dayOffset = getDayOffset("2026-03-05");
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const totalHoursFromWindowStart = (dayOffset + 1) * 24 + h + m / 60;
  return totalHoursFromWindowStart / TOTAL_HOURS;
}

/*const interface FiltersFormat : {
  fDate: string;
  fService: string;
  fDep: string;
  fArr: string;
  fFlight: string;
  fSubtype: string;
}*/
export const DEFAULT_PROFILE = {
  id: "default",
  name: "Défaut",
  filters: {
    fDate:    [],   // [] = all dates
    fService: [],   // [] = all services
    fDep:     [],   // [] = all departures
    fArr:     [],   // [] = all arrivals
    fFlight:  "",
    fSubtype: [],   // [] = all subtypes
    fReg:     [],   // [] = all registrations
  },
  utcMode: true,
  dayCount: 1,
};
