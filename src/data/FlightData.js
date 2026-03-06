/* ──────────────────────────────────────────────────────────
   FlightData.js  –  Mock data generator
   35 Aircraft × 10 flights per day
─────────────────────────────────────────────────────────── */

export const STATUS = {
  OnTime: 'OnTime',
  MinorDelay: 'MinorDelay',
  CriticalDelay: 'CriticalDelay',
};

export const STATUS_COLOR = {
  OnTime: '#27AE60',
  MinorDelay: '#F39C12',
  CriticalDelay: '#D71920',
};

/** Generate 35 aircraft IDs: CN-RAM → CN-RZZ */
function buildAircraftList() {
  const list = [];
  const types = ['B787', 'B737', 'E190'];
  // Two-letter suffix starting at AM
  // A=65, M=77 → index 0..25 for second letter, outer for first
  let firstCode = 'A'.charCodeAt(0); // fixed first letter = A for all 35
  let secondCode = 'M'.charCodeAt(0); // start at M (AM, AN, AO … AZ, BA, BB …)

  for (let i = 0; i < 35; i++) {
    const suffix = String.fromCharCode(firstCode) + String.fromCharCode(secondCode);
    list.push({
      id: `CN-R${suffix}`,
      label: `CN-R${suffix}`,
      type: types[i % 3],
    });
    secondCode++;
    if (secondCode > 'Z'.charCodeAt(0)) {
      secondCode = 'A'.charCodeAt(0);
      firstCode++;
    }
  }
  return list;
}

const AIRPORTS = ['CMN', 'ORY', 'CDG', 'LHR', 'MAD', 'BCN', 'IST', 'FCO', 'DXB', 'JFK'];

function randomStatus() {
  const r = Math.random();
  if (r > 0.90) return STATUS.CriticalDelay;
  if (r > 0.70) return STATUS.MinorDelay;
  return STATUS.OnTime;
}

let _idCounter = 1;

function buildFlightsForDay(aircraft, dayDate) {
  const flights = [];
  let cursor = 0; // minutes from midnight

  for (let f = 0; f < 10; f++) {
    const gap = 40 + Math.floor(Math.random() * 20); // 40–60 min gap
    const duration = 60 + Math.floor(Math.random() * 90); // 60–150 min flight

    const estStart = cursor + gap;
    const estEnd = estStart + duration;
    if (estEnd >= 24 * 60) break;

    const status = randomStatus();
    const delayMin = status === STATUS.CriticalDelay
      ? 45 + Math.floor(Math.random() * 75)
      : status === STATUS.MinorDelay
        ? 5 + Math.floor(Math.random() * 35)
        : 0;
    const delayCode = status === STATUS.CriticalDelay ? 'TECH'
      : status === STATUS.MinorDelay ? 'WX' : '';

    const baseMs = dayDate.getTime();
    const ms = (m) => new Date(baseMs + m * 60_000);

    const origin = 'CMN';
    const dest = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    const fno = `AT${100 + Math.floor(Math.random() * 800)}`;
    const pax = 50 + Math.floor(Math.random() * 180);

    flights.push({
      id: _idCounter++,
      flightNumber: fno,
      aircraft: `${aircraft.id} (${aircraft.type})`,
      group: aircraft.id,
      origin,
      destination: dest,
      route: `${origin}–${dest}`,
      paxCount: pax,
      status,
      delayMinutes: delayMin,
      delayCode,
      // Estimated (baseline)
      estStart: ms(estStart),
      estEnd: ms(estEnd),
      // Actual (baseline + delay)
      actStart: ms(estStart + delayMin),
      actEnd: ms(estEnd + delayMin),
      // Timeline window: union of est + act
      start: ms(Math.min(estStart, estStart + delayMin)),
      end: ms(Math.max(estEnd, estEnd + delayMin)),
      // OOOI
      outTime: ms(estStart + delayMin),
      offTime: ms(estStart + delayMin + 15),
      onTime: ms(estEnd + delayMin - 15),
      inTime: ms(estEnd + delayMin),
    });

    cursor = estEnd;
  }
  return flights;
}

/** Returns { aircraft: [...], flights: [...] } */
export function generateMockData() {
  _idCounter = 1;
  const aircraft = buildAircraftList();
  const flights = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const ac of aircraft) {
    [-1, 0, 1].forEach(offset => {
      const day = new Date(today);
      day.setDate(day.getDate() + offset);
      flights.push(...buildFlightsForDay(ac, day));
    });
  }

  const groups = aircraft.map(ac => ({
    id: ac.id,
    content: `<span class="group-label">${ac.id}</span><span class="group-type">${ac.type}</span>`,
  }));

  return { aircraft, groups, flights };
}
