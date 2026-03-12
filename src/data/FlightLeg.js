/**
 * FlightLeg.js — Data Ingestion & Transformation Layer
 * =====================================================
 *
 * PURPOSE
 * -------
 * This module acts as the bridge between raw external data (CSV / Excel /
 * materialized SQL view) and the internal flight-leg format used throughout
 * the app (GanttTimeline, FlightStatus, StationView).
 *
 * HOW TO SWITCH FROM MOCK DATA TO REAL DATA
 * ------------------------------------------
 * 1. Parse your CSV / Excel file with SheetJS:
 *
 *      import * as XLSX from 'xlsx'
 *      const wb   = XLSX.read(fileBuffer, { type: 'array' })
 *      const ws   = wb.Sheets[wb.SheetNames[0]]
 *      const rows = XLSX.utils.sheet_to_json(ws)   // array of plain objects
 *
 * 2. Transform to the internal format:
 *
 *      import { transformFlights, buildGroups } from './FlightLeg'
 *      const { flights, groups } = transformFlights(rows)
 *
 * 3. Replace every `generateMockData()` call in the app with this object:
 *      const { flights, groups, aircraft } = transformFlights(rawRows)
 *
 * FIELD MAPPING (RAW_FIELD_MAP)
 * ------------------------------
 * The keys are the column names expected in the raw source.
 * Adjust them to match your actual CSV/Excel column headers or SQL view columns.
 *
 * For a SQL materialized view, alias your columns to match these names:
 *   SELECT flight_number AS "FLIGHT_NO", ... FROM ops.mv_flight_legs
 */

// ── Raw-column → internal-field name map ─────────────────────────────────────
export const RAW_FIELD_MAP = {
  FLIGHT_NO:    'flightNumber',   // e.g. "AT123"
  'A/C_REG':    'aircraft',       // Registration, e.g. "CN-RAT"
  'A/C_TYPE':   'aircraftType',   // e.g. "B737-800"
  ORIGIN:       'origin',         // IATA code, e.g. "CMN"
  DEST:         'destination',    // IATA code, e.g. "LHR"
  STD:          'estStart',       // Scheduled departure — ISO string or parseable date
  STA:          'estEnd',         // Scheduled arrival
  ATD:          'actStart',       // Actual departure (null/undefined if not departed)
  ATA:          'actEnd',         // Actual arrival   (null/undefined if not arrived)
  OUT_TIME:     'outTime',        // OOOI: aircraft pushes back from gate
  OFF_TIME:     'offTime',        // OOOI: wheels off
  ON_TIME:      'onTime',         // OOOI: wheels on
  IN_TIME:      'inTime',         // OOOI: aircraft at gate (chocks on)
  SERVICE_TYPE: 'serviceType',    // One of: J, F, P, O, S, Z
  PAX_COUNT:    'paxCount',       // Integer passenger count (0 for cargo/maintenance)
  DELAY_CODE:   'delayCode',      // e.g. "TECH", "WX", "ATC"
  DELAY_MIN:    'delayMinutes',   // Integer minutes of delay (0 = on-time)
}

// ── Determine delay status from delay minutes ─────────────────────────────────
export function parseDelayStatus(delayMinutes, minorThreshold = 15, criticalThreshold = 45) {
  const mins = Number(delayMinutes) || 0
  if (mins >= criticalThreshold) return 'CriticalDelay'
  if (mins >= minorThreshold)    return 'MinorDelay'
  return 'OnTime'
}

// ── Build vis-timeline group rows from a flights array ────────────────────────
// Groups are one row per unique aircraft registration.
export function buildGroups(flights) {
  const seen = new Set()
  const groups = []
  for (const f of flights) {
    if (!seen.has(f.aircraft)) {
      seen.add(f.aircraft)
      groups.push({
        id:      f.aircraft,
        content: `<span class="group-label">${f.aircraft}<span class="group-type">${f.aircraftType ?? ''}</span></span>`,
      })
    }
  }
  return groups
}

// ── Build the unique aircraft list (used by GanttFilterBar) ──────────────────
export function buildAircraftList(flights) {
  const map = new Map()
  for (const f of flights) {
    if (!map.has(f.aircraft)) map.set(f.aircraft, f.aircraftType ?? '')
  }
  return [...map.entries()].map(([id, type]) => ({ id, type }))
}

// ── Transform raw rows → internal flight-leg objects ─────────────────────────
/**
 * @param {Object[]} rawRows  — array of plain objects from XLSX.utils.sheet_to_json
 * @param {Object}   [fieldMap] — override RAW_FIELD_MAP if your columns differ
 * @returns {{ flights, groups, aircraft }}
 */
export function transformFlights(rawRows, fieldMap = RAW_FIELD_MAP) {
  // Build reverse map: internalKey → raw value lookup
  const flights = rawRows.map((row, idx) => {
    const f = {}

    // Map raw columns to internal fields
    for (const [rawKey, internalKey] of Object.entries(fieldMap)) {
      const val = row[rawKey]
      if (val !== undefined && val !== null && val !== '') {
        f[internalKey] = val
      }
    }

    // ── Required computed fields ─────────────────────────────────────────────
    f.id            = f.id ?? `leg-${Date.now()}-${idx}`
    f.group         = f.aircraft ?? 'UNKNOWN'
    f.route         = `${f.origin ?? '??'}–${f.destination ?? '??'}`
    f.paxCount      = Number(f.paxCount)      || 0
    f.delayMinutes  = Number(f.delayMinutes)  || 0
    f.isMaintenance = f.serviceType === 'Z'

    // Fallback: if actual times are missing, use scheduled
    f.actStart = f.actStart || f.estStart
    f.actEnd   = f.actEnd   || f.estEnd

    // vis-timeline item start/end (the bar position):
    // use actual departure for start, scheduled arrival for end when available
    f.start = f.actStart || f.estStart
    f.end   = f.actEnd   || f.estEnd

    // Delay status
    f.status = parseDelayStatus(f.delayMinutes)

    // Parse date strings to consistent ISO format if needed
    for (const field of ['estStart', 'estEnd', 'actStart', 'actEnd', 'outTime', 'offTime', 'onTime', 'inTime', 'start', 'end']) {
      if (f[field] && typeof f[field] === 'string') {
        const d = new Date(f[field])
        if (!isNaN(d.getTime())) f[field] = d.toISOString()
      }
      // Handle Excel serial date numbers
      if (f[field] && typeof f[field] === 'number') {
        f[field] = excelSerialToISO(f[field])
      }
    }

    return f
  })

  const groups  = buildGroups(flights)
  const aircraft = buildAircraftList(flights)

  return { flights, groups, aircraft }
}

// ── Excel serial date → ISO string ───────────────────────────────────────────
// Excel stores dates as days since 1900-01-01 (with a leap-year bug at day 60).
function excelSerialToISO(serial) {
  const utcDays   = Math.floor(serial - 25569)     // 25569 = days from 1900-01-01 to 1970-01-01
  const utcValue  = utcDays * 86400 * 1000
  const fractional = serial - Math.floor(serial)
  const ms = Math.round(fractional * 86400 * 1000)
  return new Date(utcValue + ms).toISOString()
}

// ── CSV text → raw rows ───────────────────────────────────────────────────────
// Convenience helper for plain CSV strings (no library needed for simple CSVs).
export function parseCsvText(csvText) {
  const lines   = csvText.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}
