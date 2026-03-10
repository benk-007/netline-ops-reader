/* ──────────────────────────────────────────────────────────
   FlightData.js  –  Mock data generator
   35 Aircraft × 7 flights per day × 10 days (-6 to +3)
─────────────────────────────────────────────────────────── */

// ── Service Types ─────────────────────────────────────────
export const SERVICE_TYPE = {
  J: 'J', // Scheduled Services Normal
  S: 'S', // Scheduled Services Shuttle
  F: 'F', // Cargo Services Normal
  C: 'C', // Charter Services Pax
  Q: 'Q', // Cargo Services Pax
  O: 'O', // Others Non-Rev (Ferry)
  Z: 'Z', // Internal Purpose / Maintenance
  P: 'P', // Positioning
}

export const SERVICE_LABEL = {
  J: 'J – Scheduled Normal',
  S: 'S – Scheduled Shuttle',
  F: 'F – Cargo Normal',
  C: 'C – Charter Pax',
  Q: 'Q – Cargo Pax',
  O: 'O – Non-Rev (Ferry)',
  Z: 'Z – Maintenance',
  P: 'P – Positioning',
}

// ── Service Colors (by service type) ─────────────────────
export const SERVICE_COLOR = {
  J: '#607080', // Grey
  S: '#607080', // Grey
  F: '#C0392B', // Red
  C: '#1E8449', // Dark Green
  Q: '#6D0026', // Bordeaux
  O: '#27AE60', // Light Green
  P: '#27AE60', // Light Green
  Z: '#F1C40F', // Yellow – Maintenance
  default: '#607080',
}

// ── Status (used for delay classification) ───────────────
export const STATUS = {
  OnTime: 'OnTime',
  MinorDelay: 'MinorDelay',
  CriticalDelay: 'CriticalDelay',
}

// ── Weighted service type selection ──────────────────────
const SERVICE_WEIGHTS = [
  { type: 'J', weight: 65 },
  { type: 'F', weight:  5 },
  { type: 'C', weight:  5 },
  { type: 'Q', weight:  5 },
  { type: 'O', weight:  5 },
  { type: 'Z', weight:  5 },
  { type: 'S', weight:  5 },
  { type: 'P', weight:  5 },
]

function randomServiceType() {
  const total = SERVICE_WEIGHTS.reduce((s, w) => s + w.weight, 0)
  let r = Math.random() * total
  for (const { type, weight } of SERVICE_WEIGHTS) {
    r -= weight
    if (r <= 0) return type
  }
  return 'J'
}

// ── Aircraft list (35 aircraft: CN-RAM → CN-RZZ) ─────────
const AIRCRAFT_TYPES = ['B787-8', 'B787-9', 'B737-800', 'B737-MAX', 'E190']

function buildAircraftList() {
  const list = []
  let firstCode = 'A'.charCodeAt(0)
  let secondCode = 'M'.charCodeAt(0)

  for (let i = 0; i < 35; i++) {
    const suffix = String.fromCharCode(firstCode) + String.fromCharCode(secondCode)
    list.push({
      id: `CN-R${suffix}`,
      label: `CN-R${suffix}`,
      type: AIRCRAFT_TYPES[i % AIRCRAFT_TYPES.length],
    })
    secondCode++
    if (secondCode > 'Z'.charCodeAt(0)) {
      secondCode = 'A'.charCodeAt(0)
      firstCode++
    }
  }
  return list
}

export const AIRCRAFT_LIST = buildAircraftList()

// ── Airport pairs ─────────────────────────────────────────
const AIRPORT_PAIRS = [
  ['CMN', 'ORY'], ['CMN', 'CDG'], ['CMN', 'LHR'], ['CMN', 'MAD'],
  ['CMN', 'BCN'], ['CMN', 'IST'], ['CMN', 'FCO'], ['CMN', 'DXB'],
  ['CMN', 'JFK'], ['CMN', 'BRU'], ['CMN', 'AMS'], ['CMN', 'GVA'],
  ['CMN', 'RAK'], ['CMN', 'AGA'], ['CMN', 'FEZ'], ['CMN', 'TNG'],
  ['ORY', 'CMN'], ['CDG', 'CMN'], ['LHR', 'CMN'], ['MAD', 'CMN'],
]

export const ALL_AIRPORTS = [
  'CMN', 'ORY', 'CDG', 'LHR', 'MAD', 'BCN', 'IST', 'FCO',
  'DXB', 'JFK', 'BRU', 'AMS', 'GVA', 'RAK', 'AGA', 'FEZ', 'TNG',
]

function randomStatus() {
  const r = Math.random()
  if (r > 0.92) return STATUS.CriticalDelay
  if (r > 0.72) return STATUS.MinorDelay
  return STATUS.OnTime
}

let _idCounter = 1

function buildFlightsForDay(aircraft, dayDate) {
  const flights = []
  let cursor = 60 // start at 01:00

  for (let f = 0; f < 7; f++) {
    const gap      = 30 + Math.floor(Math.random() * 30)   // 30–60 min gap
    const duration = 55 + Math.floor(Math.random() * 120)  // 55–175 min flight

    const estStart = cursor + gap
    const estEnd   = estStart + duration
    if (estEnd >= 24 * 60) break

    const serviceType    = randomServiceType()
    const isMaintenance  = serviceType === 'Z'

    let status    = STATUS.OnTime
    let delayMin  = 0
    let delayCode = ''

    if (!isMaintenance) {
      status = randomStatus()
      if (status === STATUS.CriticalDelay) {
        delayMin  = 45 + Math.floor(Math.random() * 75)
        delayCode = 'TECH'
      } else if (status === STATUS.MinorDelay) {
        delayMin  = 5 + Math.floor(Math.random() * 35)
        delayCode = 'WX'
      }
    }

    const baseMs = dayDate.getTime()
    const ms = (m) => new Date(baseMs + m * 60_000)

    const pair   = AIRPORT_PAIRS[Math.floor(Math.random() * AIRPORT_PAIRS.length)]
    const origin = pair[0]
    const dest   = isMaintenance ? origin : pair[1]
    const fno    = isMaintenance
      ? 'VJ'
      : `AT${100 + Math.floor(Math.random() * 800)}`
    const pax    = isMaintenance ? 0 : 50 + Math.floor(Math.random() * 180)

    const actStartMin = estStart + delayMin
    const actEndMin   = estEnd   + delayMin

    flights.push({
      id:           _idCounter++,
      flightNumber: fno,
      aircraft:     aircraft.id,
      aircraftType: aircraft.type,
      group:        aircraft.id,
      origin,
      destination:  dest,
      route:        `${origin}–${dest}`,
      paxCount:     pax,
      serviceType,
      isMaintenance,
      status,
      delayMinutes: delayMin,
      delayCode,
      // Estimated (scheduled)
      estStart: ms(estStart),
      estEnd:   ms(estEnd),
      // Actual
      actStart: ms(actStartMin),
      actEnd:   ms(actEndMin),
      // Timeline window (union of est + act)
      start: ms(Math.min(estStart, actStartMin)),
      end:   ms(Math.max(estEnd,   actEndMin)),
      // OOOI
      outTime: ms(actStartMin),
      offTime: ms(actStartMin + 15),
      onTime:  ms(actEndMin   - 15),
      inTime:  ms(actEndMin),
    })

    cursor = estEnd
  }
  return flights
}

/** Returns { aircraft, groups, flights } */
export function generateMockData() {
  _idCounter = 1
  const aircraft = buildAircraftList()
  const flights  = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // -6 days to +3 days (10 days total)
  for (const ac of aircraft) {
    for (let offset = -6; offset <= 3; offset++) {
      const day = new Date(today)
      day.setDate(day.getDate() + offset)
      flights.push(...buildFlightsForDay(ac, day))
    }
  }

  const groups = aircraft.map(ac => ({
    id:      ac.id,
    content: `<span class="group-label">${ac.id}</span><span class="group-type">${ac.type}</span>`,
  }))

  return { aircraft, groups, flights }
}
