import { DataSet } from "vis-data";

/* ═══════════════════════════════════════════════════════════════
   LEG CLASS — mapped to production database columns
   ═══════════════════════════════════════════════════════════════ */
export class Leg {
  constructor({
    LEG_NO,
    UPDATE_KEY      = null,
    FN_CARRIER,
    FN_NUMBER,
    FN_SUFFIX       = "",
    DAY_OF_ORIGIN,
    AC_OWNER        = "",
    AC_SUBTYPE,
    AC_VERSION      = "",
    AC_REGISTRATION,
    DEP_AP_SCHED,
    ARR_AP_SCHED,
    DEP_AP_ACTUAL   = null,
    ARR_AP_ACTUAL   = null,
    LEG_STATE,
    LEG_TYPE,
    DEP_DAY_SCHED   = DAY_OF_ORIGIN,
    DEP_TIME_SCHED,
    ARR_DAY_SCHED   = DAY_OF_ORIGIN,
    ARR_TIME_SCHED,
    DELAY_CODE_01   = null,
    DELAY_TIME_01   = 0,
    DELAY_CODE_02   = null,
    DELAY_TIME_02   = 0,
    DELAY_CODE_03   = null,
    DELAY_TIME_03   = 0,
    OFF_BLOCK_DAY   = null,
    OFF_BLOCK_TIME  = null,
    AIRBORNE_DAY    = null,
    AIRBORNE_TIME   = null,
    LANDING_DAY     = null,
    LANDING_TIME    = null,
    ON_BLOCK_DAY    = null,
    ON_BLOCK_TIME   = null,
    PRBD            = null,
    CHANGE_TIME     = null,
    ENTRY_USER      = "",
  }) {
    /* ── Raw DB columns ── */
    this.LEG_NO          = LEG_NO;
    this.UPDATE_KEY      = UPDATE_KEY;
    this.FN_CARRIER      = FN_CARRIER;
    this.FN_NUMBER       = FN_NUMBER;
    this.FN_SUFFIX       = FN_SUFFIX;
    this.DAY_OF_ORIGIN   = DAY_OF_ORIGIN;
    this.AC_OWNER        = AC_OWNER;
    this.AC_SUBTYPE      = AC_SUBTYPE;
    this.AC_VERSION      = AC_VERSION;
    this.AC_REGISTRATION = AC_REGISTRATION;
    this.DEP_AP_SCHED    = DEP_AP_SCHED;
    this.ARR_AP_SCHED    = ARR_AP_SCHED;
    this.DEP_AP_ACTUAL   = DEP_AP_ACTUAL;
    this.ARR_AP_ACTUAL   = ARR_AP_ACTUAL;
    this.LEG_STATE       = LEG_STATE;
    this.LEG_TYPE        = LEG_TYPE;
    this.DEP_DAY_SCHED   = DEP_DAY_SCHED;
    this.DEP_TIME_SCHED  = DEP_TIME_SCHED;
    this.ARR_DAY_SCHED   = ARR_DAY_SCHED;
    this.ARR_TIME_SCHED  = ARR_TIME_SCHED;
    this.DELAY_CODE_01   = DELAY_CODE_01;
    this.DELAY_TIME_01   = DELAY_TIME_01;
    this.DELAY_CODE_02   = DELAY_CODE_02;
    this.DELAY_TIME_02   = DELAY_TIME_02;
    this.DELAY_CODE_03   = DELAY_CODE_03;
    this.DELAY_TIME_03   = DELAY_TIME_03;
    this.OFF_BLOCK_DAY   = OFF_BLOCK_DAY;
    this.OFF_BLOCK_TIME  = OFF_BLOCK_TIME;
    this.AIRBORNE_DAY    = AIRBORNE_DAY;
    this.AIRBORNE_TIME   = AIRBORNE_TIME;
    this.LANDING_DAY     = LANDING_DAY;
    this.LANDING_TIME    = LANDING_TIME;
    this.ON_BLOCK_DAY    = ON_BLOCK_DAY;
    this.ON_BLOCK_TIME   = ON_BLOCK_TIME;
    this.PRBD            = PRBD;
    this.CHANGE_TIME     = CHANGE_TIME;
    this.ENTRY_USER      = ENTRY_USER;
  }

  get id()      { return this.LEG_NO; }
  get fn()      { return `${this.FN_CARRIER}${this.FN_NUMBER}`; }
  get reg()     { return this.AC_REGISTRATION; }
  get subtype() { return this.AC_SUBTYPE; }
  get service() { return this.LEG_TYPE; }
  get dep()     { return this.DEP_AP_SCHED; }
  get arr()     { return this.ARR_AP_SCHED; }
  get depUtc()  { return this.DEP_TIME_SCHED; }
  get arrUtc()  { return this.ARR_TIME_SCHED; }
  get state()   { return this.LEG_STATE; }
  get date()    { return this.DAY_OF_ORIGIN; }
  get delay()   { return this.DELAY_TIME_01 || 0; }

  /* Total delay across all three codes */
  get totalDelay() {
    return (this.DELAY_TIME_01 || 0) + (this.DELAY_TIME_02 || 0) + (this.DELAY_TIME_03 || 0);
  }
}

/* ═══════════════════════════════════════════════════════════════
   GENERATED MOCK FLEET DATA — 40 aircraft, 12 days
   ═══════════════════════════════════════════════════════════════ */

/** Returns "YYYY-MM-DD" for today + offset days (local time) */
function dayOffset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}

/* ── Fleet definitions ── */
const B737_REGS = [
  'CN-RHA','CN-RHB','CN-RHC','CN-RHD','CN-RHE',
  'CN-RHF','CN-RHG','CN-RHH','CN-RHI','CN-RHJ',
  'CN-RHK','CN-RHL','CN-RHM','CN-RHN','CN-RHO',
  'CN-RHP','CN-RHQ','CN-RHR','CN-RHS','CN-RHT',
];

const B789_REGS = [
  'CN-ROA','CN-ROB','CN-ROC','CN-ROD','CN-ROE',
  'CN-ROF','CN-ROG','CN-ROH',
];

const B788_REGS = [
  'CN-ROI','CN-ROJ','CN-ROK','CN-ROL',
];

const ATR_REGS = [
  'CN-RGA','CN-RGB','CN-RGC','CN-RGD',
  'CN-RGE','CN-RGF','CN-RGG','CN-RGH',
];

/*
 * Route pairs — one entry per destination.
 * outFn / retFn : flight numbers for outbound and return leg.
 * dur           : flight duration in minutes (same each direction).
 * svc           : service type.
 * Hub is always CMN for all fleets.
 */
const HUB = 'CMN';

const B737_PAIRS = [
  { dest: 'ORY', outFn: '200', retFn: '201', dur: 210, svc: 'J'   },
  { dest: 'BCN', outFn: '300', retFn: '301', dur: 155, svc: 'PAX' },
  { dest: 'FCO', outFn: '400', retFn: '401', dur: 220, svc: 'PAX' },
  { dest: 'BRU', outFn: '410', retFn: '411', dur: 210, svc: 'J'   },
  { dest: 'LHR', outFn: '500', retFn: '501', dur: 185, svc: 'PAX' },
  { dest: 'FRA', outFn: '510', retFn: '511', dur: 210, svc: 'PAX' },
  { dest: 'GVA', outFn: '520', retFn: '521', dur: 210, svc: 'PAX' },
  { dest: 'DKR', outFn: '530', retFn: '531', dur: 270, svc: 'PAX' },
  { dest: 'AMS', outFn: '540', retFn: '541', dur: 210, svc: 'J'   },
  { dest: 'MAD', outFn: '550', retFn: '551', dur: 95,  svc: 'PAX' },
  { dest: 'TUN', outFn: '560', retFn: '561', dur: 130, svc: 'PAX' },
  { dest: 'ALG', outFn: '570', retFn: '571', dur: 110, svc: 'PAX' },
  { dest: 'LIS', outFn: '610', retFn: '611', dur: 115, svc: 'PAX' },
  { dest: 'MXP', outFn: '620', retFn: '621', dur: 215, svc: 'PAX' },
];

const B789_PAIRS = [
  { dest: 'JFK', outFn: '100', retFn: '101', dur: 480, svc: 'J'       },
  { dest: 'YUL', outFn: '110', retFn: '111', dur: 510, svc: 'PAX'     },
  { dest: 'CDG', outFn: '130', retFn: '131', dur: 210, svc: 'J'       },
  { dest: 'DXB', outFn: '140', retFn: '141', dur: 450, svc: 'J'       },
  { dest: 'IST', outFn: '700', retFn: '701', dur: 270, svc: 'Charter' },
  { dest: 'CAI', outFn: '710', retFn: '711', dur: 210, svc: 'PAX'     },
  { dest: 'LOS', outFn: '720', retFn: '721', dur: 360, svc: 'PAX'     },
  { dest: 'DOH', outFn: '730', retFn: '731', dur: 450, svc: 'VJ'      },
];

const B788_PAIRS = [
  { dest: 'CDG', outFn: '120', retFn: '121', dur: 210, svc: 'J'   },
  { dest: 'ORY', outFn: '122', retFn: '123', dur: 210, svc: 'J'   },
  { dest: 'DOH', outFn: '960', retFn: '961', dur: 450, svc: 'VJ'  },
  { dest: 'CAI', outFn: '890', retFn: '891', dur: 210, svc: 'PAX' },
];

const ATR_PAIRS = [
  { dest: 'RAK', outFn: '630', retFn: '631', dur: 60, svc: 'PAX'   },
  { dest: 'NDR', outFn: '632', retFn: '633', dur: 70, svc: 'PAX'   },
  { dest: 'FES', outFn: '640', retFn: '641', dur: 50, svc: 'PAX'   },
  { dest: 'AGA', outFn: '650', retFn: '651', dur: 60, svc: 'PAX'   },
  { dest: 'OUD', outFn: '660', retFn: '661', dur: 70, svc: 'PAX'   },
  { dest: 'OZZ', outFn: '670', retFn: '671', dur: 90, svc: 'S'     },
  { dest: 'ERH', outFn: '680', retFn: '681', dur: 90, svc: 'PAX'   },
  { dest: 'TNG', outFn: '690', retFn: '691', dur: 45, svc: 'Ferry' },
];

/* ── Delay codes ── */
const DELAY_CODES = ['93', '15', '71', '89'];

/* ── Helpers ── */
function addTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function minutesToTime(mins) {
  const clamped = Math.max(0, Math.min(1439, mins));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/* ── Deterministic pseudo-random seeded by string ── */
function seededHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ── Day range: -7 to +5 (13 days total) ── */
const DAY_OFFSETS = [-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5];

/**
 * Generates all legs for an entire fleet across all day offsets.
 *
 * Each aircraft builds a geographic chain each day:
 *   CMN → A  →  A → CMN  →  CMN → B  →  B → CMN  → …
 * Arrival airport of leg N is always the departure airport of leg N+1.
 * No two legs on the same aircraft overlap in time.
 *
 * Target per aircraft-day: 4–8 legs, 60 % chance of 7.
 */
function generateFleetLegs(regs, subtype, pairs, dayOffsets) {
  const allLegs = [];

  for (const reg of regs) {
    /* Per-aircraft seed used for start-time staggering */
    const regSeed = seededHash(reg);

    for (const offsetN of dayOffsets) {
      const dateStr  = dayOffset(offsetN);
      const daySeed  = seededHash(`${reg}-${dateStr}`);
      const isPast   = offsetN < 0;
      const isFuture = offsetN > 0;

      /* ── Target flight count: 4-8, 60 % = 7 ── */
      const roll   = daySeed % 100;
      const target = roll < 8 ? 4 : roll < 18 ? 5 : roll < 30 ? 6 : roll < 90 ? 7 : 8;

      /* ── Staggered start: 05:00 – 07:00 (per aircraft) ── */
      const startMin = 300 + (regSeed % 121);

      let currentPos  = HUB;
      let currentMin  = startMin;
      let prevOutDest = null; /* avoid picking the same destination twice in a row */
      let legIdx      = 0;

      while (legIdx < target) {
        const legSeed = seededHash(`${reg}-${dateStr}-${legIdx}`);

        let depAp, arrAp, fn, dur, svc;

        if (currentPos === HUB) {
          /* ── Outbound: pick a destination ── */
          const available = pairs.filter(p => p.dest !== prevOutDest);
          const pool      = available.length > 0 ? available : pairs;
          const pair      = pool[legSeed % pool.length];
          depAp      = HUB;
          arrAp      = pair.dest;
          fn         = pair.outFn;
          dur        = pair.dur;
          svc        = pair.svc;
          prevOutDest = pair.dest;
        } else {
          /* ── Return to hub ── */
          const pair = pairs.find(p => p.dest === currentPos);
          if (!pair) { currentPos = HUB; continue; }
          depAp = currentPos;
          arrAp = HUB;
          fn    = pair.retFn;
          dur   = pair.dur;
          svc   = pair.svc;
        }

        const arrMin = currentMin + dur;
        if (arrMin > 23 * 60 + 59) break; /* don't schedule past midnight */

        const depTime = minutesToTime(currentMin);
        const arrTime = minutesToTime(arrMin);
        const legNo   = `${reg}-${offsetN + 7}-${legIdx}`;

        /* ── State determination ── */
        let legState = 'Scheduled';
        let extra    = {};

        if (isPast) {
          legState = 'Arrived';
          extra = {
            OFF_BLOCK_TIME: addTime(depTime, 3),
            AIRBORNE_TIME:  addTime(depTime, 15),
            LANDING_TIME:   addTime(arrTime, -5),
            ON_BLOCK_TIME:  addTime(arrTime, 5),
          };
        } else if (!isFuture) {
          /* today — derive state from current departure minute */
          if (currentMin < 9 * 60) {
            legState = 'Arrived';
            extra = {
              OFF_BLOCK_TIME: addTime(depTime, 3),
              AIRBORNE_TIME:  addTime(depTime, 15),
              LANDING_TIME:   addTime(arrTime, -5),
              ON_BLOCK_TIME:  addTime(arrTime, 5),
            };
          } else if (currentMin < 11 * 60) {
            legState = 'Airborne';
            extra = {
              OFF_BLOCK_TIME: addTime(depTime, 3),
              AIRBORNE_TIME:  addTime(depTime, 15),
            };
          } else if (currentMin < 12 * 60 + 30) {
            legState = 'Boarding';
          }

          /* ~8 % delayed */
          const delayRoll = (legSeed % 100) / 100;
          if (delayRoll < 0.08 && legState === 'Scheduled') {
            legState = 'Delayed';
            extra = {
              DELAY_CODE_01: DELAY_CODES[legSeed % DELAY_CODES.length],
              DELAY_TIME_01: 15 + (legSeed % 46),
            };
          }
          /* ~3 % cancelled */
          const cancelRoll = ((legSeed >> 3) % 100) / 100;
          if (cancelRoll < 0.03 && legState === 'Scheduled') {
            legState = 'Cancelled';
          }
        }

        allLegs.push(new Leg({
          LEG_NO:          legNo,
          FN_CARRIER:      'AT',
          FN_NUMBER:       fn,
          AC_REGISTRATION: reg,
          AC_SUBTYPE:      subtype,
          DEP_AP_SCHED:    depAp,
          ARR_AP_SCHED:    arrAp,
          DEP_TIME_SCHED:  depTime,
          ARR_TIME_SCHED:  arrTime,
          LEG_STATE:       legState,
          LEG_TYPE:        svc,
          DAY_OF_ORIGIN:   dateStr,
          ...extra,
        }));

        /* ── Advance clock: turnaround 25 – 40 min (seeded) ── */
        const turnaround = 25 + (seededHash(`${reg}-${dateStr}-${legIdx}-ta`) % 16);
        currentPos = arrAp;
        currentMin = arrMin + turnaround;
        legIdx++;
      }
    }
  }

  return allLegs;
}

export const legs = [
  ...generateFleetLegs(B737_REGS, 'B737-800',  B737_PAIRS, DAY_OFFSETS),
  ...generateFleetLegs(B789_REGS, 'B787-9',    B789_PAIRS, DAY_OFFSETS),
  ...generateFleetLegs(B788_REGS, 'B787-8',    B788_PAIRS, DAY_OFFSETS),
  ...generateFleetLegs(ATR_REGS,  'ATR72-600', ATR_PAIRS,  DAY_OFFSETS),
];

console.log(`[flightsData] Generated ${legs.length} legs for ${B737_REGS.length + B789_REGS.length + B788_REGS.length + ATR_REGS.length} aircraft across ${DAY_OFFSETS.length} days`);

/* ── Build DataSets from any legs array ── */
export function buildGroups(legsArr) {
  const uniqueRegs = [...new Set(legsArr.map(l => l.AC_REGISTRATION))];
  return new DataSet(uniqueRegs.map(reg => ({ id: reg, content: reg })));
}

export function buildItems(legsArr) {
  return new DataSet(
    legsArr.map((leg, index) => ({
      id: index + 1,
      group: leg.AC_REGISTRATION,
      content: `${leg.fn} ${leg.dep} → ${leg.arr}`,
      start: `${leg.DAY_OF_ORIGIN}T${leg.DEP_TIME_SCHED}:00`,
      end:   `${leg.DAY_OF_ORIGIN}T${leg.ARR_TIME_SCHED}:00`,
    }))
  );
}

export function buildDates(legsArr) {
  return [...new Set(legsArr.map(l => l.DAY_OF_ORIGIN))].sort();
}

/* ── Default DataSets (from mock data) ── */
export const groups = buildGroups(legs);
export const items  = buildItems(legs);
export const dates  = buildDates(legs);
