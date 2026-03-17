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
   MOCK LEGS — representative RAM network data
   ~85 legs across 25 aircraft. Majority Scheduled (grey),
   some Arrived, a few Airborne/Boarding/Delayed, 2 Cancelled.
   All service types represented: PAX, J, F, P, O, S, VJ, Charter, Cargo, Ferry, Maintenance
   ═══════════════════════════════════════════════════════════════ */
const D = "2026-03-05";
const L = (no, fn, reg, sub, dep, arr, dt, at, st, svc, extra = {}) =>
  new Leg({ LEG_NO: no, FN_CARRIER: "AT", FN_NUMBER: fn, AC_REGISTRATION: reg, AC_SUBTYPE: sub,
    DEP_AP_SCHED: dep, ARR_AP_SCHED: arr, DEP_TIME_SCHED: dt, ARR_TIME_SCHED: at,
    LEG_STATE: st, LEG_TYPE: svc, DAY_OF_ORIGIN: D, ...extra });

export const legs = [
  /* ── CN-RHA  B737-800 — Europe (J) ───────────────── */
  L("L001","200","CN-RHA","B737-800","CMN","ORY","06:00","09:30","Arrived","J",{OFF_BLOCK_TIME:"06:02",AIRBORNE_TIME:"06:14",LANDING_TIME:"09:28",ON_BLOCK_TIME:"09:35"}),
  L("L002","201","CN-RHA","B737-800","ORY","CMN","11:30","15:00","Airborne","J",{OFF_BLOCK_TIME:"11:33",AIRBORNE_TIME:"11:45"}),
  L("L003","202","CN-RHA","B737-800","CMN","LYS","17:00","20:30","Scheduled","J"),
  L("L004","203","CN-RHA","B737-800","LYS","CMN","21:30","23:50","Scheduled","J"),

  /* ── CN-RHB  B737-800 — Spain (PAX) ─────────────── */
  L("L005","300","CN-RHB","B737-800","CMN","BCN","07:00","09:40","Arrived","PAX",{OFF_BLOCK_TIME:"07:03",AIRBORNE_TIME:"07:15",LANDING_TIME:"09:38",ON_BLOCK_TIME:"09:44"}),
  L("L006","301","CN-RHB","B737-800","BCN","CMN","11:00","13:40","Scheduled","PAX"),
  L("L007","302","CN-RHB","B737-800","CMN","MAD","15:30","17:10","Scheduled","PAX"),
  L("L008","303","CN-RHB","B737-800","MAD","CMN","18:30","20:10","Scheduled","PAX"),

  /* ── CN-RHC  B737-800 — Italy (PAX) ─────────────── */
  L("L009","400","CN-RHC","B737-800","CMN","FCO","08:00","11:40","Arrived","PAX",{OFF_BLOCK_TIME:"08:02",AIRBORNE_TIME:"08:14",LANDING_TIME:"11:38",ON_BLOCK_TIME:"11:45"}),
  L("L010","401","CN-RHC","B737-800","FCO","CMN","13:30","17:10","Scheduled","PAX"),
  L("L011","402","CN-RHC","B737-800","CMN","MXP","18:30","22:00","Scheduled","PAX"),

  /* ── CN-RHD  B737-800 — Belgium (J) ─────────────── */
  L("L012","410","CN-RHD","B737-800","CMN","BRU","06:30","10:00","Arrived","J",{OFF_BLOCK_TIME:"06:32",AIRBORNE_TIME:"06:44",LANDING_TIME:"09:58",ON_BLOCK_TIME:"10:05"}),
  L("L013","411","CN-RHD","B737-800","BRU","CMN","12:00","15:20","Delayed","J",{DELAY_CODE_01:"93",DELAY_TIME_01:40}),
  L("L014","412","CN-RHD","B737-800","CMN","AMS","17:30","21:00","Scheduled","J"),

  /* ── CN-RHE  B737-800 — UK (PAX) ────────────────── */
  L("L015","500","CN-RHE","B737-800","CMN","LHR","07:30","11:00","Arrived","PAX",{OFF_BLOCK_TIME:"07:32",AIRBORNE_TIME:"07:45",LANDING_TIME:"10:58",ON_BLOCK_TIME:"11:05"}),
  L("L016","501","CN-RHE","B737-800","LHR","CMN","13:00","16:30","Boarding","PAX"),
  L("L017","502","CN-RHE","B737-800","CMN","MAN","18:00","21:30","Scheduled","PAX"),

  /* ── CN-RHF  B737-800 — Germany (PAX) ───────────── */
  L("L018","510","CN-RHF","B737-800","CMN","FRA","06:00","09:30","Arrived","PAX",{OFF_BLOCK_TIME:"06:03",AIRBORNE_TIME:"06:15",LANDING_TIME:"09:28",ON_BLOCK_TIME:"09:34"}),
  L("L019","511","CN-RHF","B737-800","FRA","CMN","11:30","15:00","Scheduled","PAX"),
  L("L020","512","CN-RHF","B737-800","CMN","MUC","16:30","20:00","Scheduled","PAX"),
  L("L021","513","CN-RHF","B737-800","MUC","CMN","21:00","23:30","Scheduled","PAX"),

  /* ── CN-RHG  B737-800 — Domestic (PAX) — Cancelled ─ */
  L("L022","600","CN-RHG","B737-800","CMN","AGA","08:00","09:00","Cancelled","PAX"),
  L("L023","601","CN-RHG","B737-800","AGA","CMN","10:30","11:30","Cancelled","PAX"),

  /* ── CN-RHH  B737-800 — Maghreb (PAX) ──────────── */
  L("L024","610","CN-RHH","B737-800","CMN","TUN","07:00","09:10","Arrived","PAX",{OFF_BLOCK_TIME:"07:04",AIRBORNE_TIME:"07:16",LANDING_TIME:"09:08",ON_BLOCK_TIME:"09:14"}),
  L("L025","611","CN-RHH","B737-800","TUN","CMN","10:30","12:40","Delayed","PAX",{DELAY_CODE_01:"15",DELAY_TIME_01:25}),
  L("L026","612","CN-RHH","B737-800","CMN","ALG","15:00","16:50","Scheduled","PAX"),
  L("L027","613","CN-RHH","B737-800","ALG","CMN","18:00","19:50","Scheduled","PAX"),

  /* ── CN-RHI  B737-800 — Domestic shuttle (PAX) ──── */
  L("L028","620","CN-RHI","B737-800","CMN","RAK","07:30","08:30","Arrived","PAX",{OFF_BLOCK_TIME:"07:33",AIRBORNE_TIME:"07:43",LANDING_TIME:"08:28",ON_BLOCK_TIME:"08:33"}),
  L("L029","621","CN-RHI","B737-800","RAK","CMN","09:30","10:30","Arrived","PAX",{OFF_BLOCK_TIME:"09:32",AIRBORNE_TIME:"09:42",LANDING_TIME:"10:28",ON_BLOCK_TIME:"10:34"}),
  L("L030","622","CN-RHI","B737-800","CMN","FES","12:00","12:50","Boarding","PAX"),
  L("L031","623","CN-RHI","B737-800","FES","CMN","14:00","14:50","Scheduled","PAX"),
  L("L032","624","CN-RHI","B737-800","CMN","OUD","16:00","17:10","Scheduled","PAX"),
  L("L033","625","CN-RHI","B737-800","OUD","CMN","18:30","19:40","Scheduled","PAX"),

  /* ── CN-RHJ  B737-800 — Freight (F) ─────────────── */
  L("L034","880","CN-RHJ","B737-800","CMN","ACC","03:00","07:30","Arrived","F",{OFF_BLOCK_TIME:"03:04",AIRBORNE_TIME:"03:16",LANDING_TIME:"07:28",ON_BLOCK_TIME:"07:35"}),
  L("L035","881","CN-RHJ","B737-800","ACC","CMN","10:00","14:30","Airborne","F",{OFF_BLOCK_TIME:"10:05",AIRBORNE_TIME:"10:18"}),
  L("L036","882","CN-RHJ","B737-800","CMN","LOS","17:00","21:00","Scheduled","F"),

  /* ── CN-ROA  B787-9 — Longhaul JFK (PAX) ────────── */
  L("L037","100","CN-ROA","B787-9","CMN","JFK","01:15","09:40","Arrived","PAX",{OFF_BLOCK_TIME:"01:18",AIRBORNE_TIME:"01:30",LANDING_TIME:"09:38",ON_BLOCK_TIME:"09:45"}),
  L("L038","101","CN-ROA","B787-9","JFK","CMN","14:30","04:20","Scheduled","PAX"),

  /* ── CN-ROB  B787-9 — Longhaul MTL (PAX) ────────── */
  L("L039","110","CN-ROB","B787-9","CMN","YUL","02:00","10:30","Arrived","PAX",{OFF_BLOCK_TIME:"02:03",AIRBORNE_TIME:"02:15",LANDING_TIME:"10:28",ON_BLOCK_TIME:"10:35"}),
  L("L040","111","CN-ROB","B787-9","YUL","CMN","15:00","04:00","Scheduled","PAX"),

  /* ── CN-ROC  B787-8 — CDG (J) ───────────────────── */
  L("L041","120","CN-ROC","B787-8","CMN","CDG","06:00","09:30","Arrived","J",{OFF_BLOCK_TIME:"06:02",AIRBORNE_TIME:"06:14",LANDING_TIME:"09:28",ON_BLOCK_TIME:"09:35"}),
  L("L042","121","CN-ROC","B787-8","CDG","CMN","11:45","15:15","Airborne","J",{OFF_BLOCK_TIME:"11:48",AIRBORNE_TIME:"12:00"}),
  L("L043","122","CN-ROC","B787-8","CMN","CDG","18:00","21:30","Scheduled","J"),

  /* ── CN-ROD  B787-9 — Charter IST ───────────────── */
  L("L044","700","CN-ROD","B787-9","CMN","IST","08:00","12:30","Airborne","Charter",{OFF_BLOCK_TIME:"08:04",AIRBORNE_TIME:"08:16"}),
  L("L045","701","CN-ROD","B787-9","IST","CMN","15:00","19:30","Scheduled","Charter"),

  /* ── CN-ROE  B737-800 — Cargo CMN-CAI ───────────── */
  L("L046","890","CN-ROE","B737-800","CMN","CAI","04:00","09:00","Arrived","Cargo",{OFF_BLOCK_TIME:"04:03",AIRBORNE_TIME:"04:15",LANDING_TIME:"08:58",ON_BLOCK_TIME:"09:05"}),
  L("L047","891","CN-ROE","B737-800","CAI","CMN","12:00","17:00","Scheduled","Cargo"),

  /* ── CN-RGA  ATR72-600 — Regional RAK (PAX) ─────── */
  L("L048","630","CN-RGA","ATR72-600","CMN","RAK","08:00","09:00","Arrived","PAX",{OFF_BLOCK_TIME:"08:02",AIRBORNE_TIME:"08:12",LANDING_TIME:"08:58",ON_BLOCK_TIME:"09:04"}),
  L("L049","631","CN-RGA","ATR72-600","RAK","CMN","10:00","11:00","Arrived","PAX",{OFF_BLOCK_TIME:"10:03",AIRBORNE_TIME:"10:13",LANDING_TIME:"10:58",ON_BLOCK_TIME:"11:04"}),
  L("L050","632","CN-RGA","ATR72-600","CMN","NDR","13:00","14:10","Scheduled","PAX"),
  L("L051","633","CN-RGA","ATR72-600","NDR","CMN","15:30","16:40","Scheduled","PAX"),

  /* ── CN-RGB  ATR72-600 — Regional FES/TNG (PAX) ─── */
  L("L052","640","CN-RGB","ATR72-600","CMN","FES","07:30","08:20","Arrived","PAX",{OFF_BLOCK_TIME:"07:32",AIRBORNE_TIME:"07:42",LANDING_TIME:"08:18",ON_BLOCK_TIME:"08:24"}),
  L("L053","641","CN-RGB","ATR72-600","FES","TNG","09:00","09:50","Arrived","PAX",{OFF_BLOCK_TIME:"09:02",AIRBORNE_TIME:"09:12",LANDING_TIME:"09:48",ON_BLOCK_TIME:"09:54"}),
  L("L054","642","CN-RGB","ATR72-600","TNG","CMN","11:00","12:00","Delayed","PAX",{DELAY_CODE_01:"89",DELAY_TIME_01:15}),
  L("L055","643","CN-RGB","ATR72-600","CMN","OZZ","14:00","15:30","Scheduled","PAX"),
  L("L056","644","CN-RGB","ATR72-600","OZZ","CMN","17:00","18:30","Scheduled","PAX"),

  /* ── CN-RGC  B737-800 — Positioning (P) ─────────── */
  L("L057","001","CN-RGC","B737-800","CMN","MRS","05:00","08:20","Arrived","P",{OFF_BLOCK_TIME:"05:03",AIRBORNE_TIME:"05:15",LANDING_TIME:"08:18",ON_BLOCK_TIME:"08:25"}),
  L("L058","002","CN-RGC","B737-800","MRS","CMN","14:00","17:20","Scheduled","P"),

  /* ── CN-RGD  B737-800 — Other/Charter (O) ───────── */
  L("L059","950","CN-RGD","B737-800","CMN","SSH","07:00","12:30","Airborne","O",{OFF_BLOCK_TIME:"07:05",AIRBORNE_TIME:"07:18"}),
  L("L060","951","CN-RGD","B737-800","SSH","CMN","16:00","21:30","Scheduled","O"),

  /* ── CN-RGE  ATR72-600 — Special (S) ────────────── */
  L("L061","005","CN-RGE","ATR72-600","CMN","ERH","09:00","10:30","Arrived","S",{OFF_BLOCK_TIME:"09:02",AIRBORNE_TIME:"09:12",LANDING_TIME:"10:28",ON_BLOCK_TIME:"10:34"}),
  L("L062","006","CN-RGE","ATR72-600","ERH","CMN","12:00","13:30","Scheduled","S"),

  /* ── CN-RGF  B787-8 — VJ (vol journée) ─────────── */
  L("L063","960","CN-RGF","B787-8","CMN","DOH","03:00","10:30","Arrived","VJ",{OFF_BLOCK_TIME:"03:04",AIRBORNE_TIME:"03:16",LANDING_TIME:"10:28",ON_BLOCK_TIME:"10:35"}),
  L("L064","961","CN-RGF","B787-8","DOH","CMN","14:00","21:30","Scheduled","VJ"),

  /* ── CN-RGG  B737-800 — Ferry + Maintenance ─────── */
  L("L065","098","CN-RGG","B737-800","CMN","TNG","06:30","07:15","Arrived","Ferry",{OFF_BLOCK_TIME:"06:32",AIRBORNE_TIME:"06:42",LANDING_TIME:"07:13",ON_BLOCK_TIME:"07:18"}),
  L("L066","099","CN-RGG","B737-800","TNG","CMN","13:00","13:45","Scheduled","Maintenance"),

  /* ── CN-RGH  B737-800 — Swiss/Portugal (PAX) ────── */
  L("L067","520","CN-RGH","B737-800","CMN","GVA","08:30","12:00","Arrived","PAX",{OFF_BLOCK_TIME:"08:33",AIRBORNE_TIME:"08:45",LANDING_TIME:"11:58",ON_BLOCK_TIME:"12:05"}),
  L("L068","521","CN-RGH","B737-800","GVA","CMN","14:00","17:30","Scheduled","PAX"),
  L("L069","522","CN-RGH","B737-800","CMN","LIS","19:00","21:00","Scheduled","PAX"),
  L("L070","523","CN-RGH","B737-800","LIS","CMN","22:00","23:50","Scheduled","PAX"),

  /* ── CN-RGI  B737-800 — West Africa (PAX) ───────── */
  L("L071","530","CN-RGI","B737-800","CMN","DKR","09:00","13:30","Delayed","PAX",{DELAY_CODE_01:"71",DELAY_TIME_01:35,OFF_BLOCK_TIME:"09:35",AIRBORNE_TIME:"09:48"}),
  L("L072","531","CN-RGI","B737-800","DKR","CMN","16:00","20:30","Scheduled","PAX"),

  /* ── CN-RGJ  B787-9 — Longhaul BKK (PAX) ────────── */
  L("L073","140","CN-RGJ","B787-9","CMN","DOH","02:00","09:00","Arrived","PAX",{OFF_BLOCK_TIME:"02:03",AIRBORNE_TIME:"02:15",LANDING_TIME:"08:58",ON_BLOCK_TIME:"09:05"}),
  L("L074","141","CN-RGJ","B787-9","DOH","CMN","13:00","20:00","Scheduled","PAX"),

  /* ── CN-RGK  B737-800 — Turkey (J) ──────────────── */
  L("L075","540","CN-RGK","B737-800","CMN","IST","06:00","10:30","Arrived","J",{OFF_BLOCK_TIME:"06:03",AIRBORNE_TIME:"06:15",LANDING_TIME:"10:28",ON_BLOCK_TIME:"10:35"}),
  L("L076","541","CN-RGK","B737-800","IST","CMN","13:00","17:30","Scheduled","J"),

  /* ── CN-RGL  B737-800 — Netherlands (PAX) ───────── */
  L("L077","550","CN-RGL","B737-800","CMN","AMS","07:00","10:30","Arrived","PAX",{OFF_BLOCK_TIME:"07:02",AIRBORNE_TIME:"07:14",LANDING_TIME:"10:28",ON_BLOCK_TIME:"10:34"}),
  L("L078","551","CN-RGL","B737-800","AMS","CMN","12:30","16:00","Scheduled","PAX"),
  L("L079","552","CN-RGL","B737-800","CMN","DUS","17:30","21:00","Scheduled","PAX"),
  L("L080","553","CN-RGL","B737-800","DUS","CMN","22:00","23:40","Scheduled","PAX"),

  /* ── CN-RGM  B737-800 — Domestic extra (PAX) ────── */
  L("L081","660","CN-RGM","B737-800","CMN","AGA","06:30","07:30","Arrived","PAX",{OFF_BLOCK_TIME:"06:32",AIRBORNE_TIME:"06:42",LANDING_TIME:"07:28",ON_BLOCK_TIME:"07:34"}),
  L("L082","661","CN-RGM","B737-800","AGA","CMN","08:30","09:30","Arrived","PAX",{OFF_BLOCK_TIME:"08:33",AIRBORNE_TIME:"08:43",LANDING_TIME:"09:28",ON_BLOCK_TIME:"09:34"}),
  L("L083","662","CN-RGM","B737-800","CMN","RAK","11:00","12:00","Boarding","PAX"),
  L("L084","663","CN-RGM","B737-800","RAK","CMN","13:30","14:30","Scheduled","PAX"),
  L("L085","664","CN-RGM","B737-800","CMN","TNG","16:00","17:00","Scheduled","PAX"),
  L("L086","665","CN-RGM","B737-800","TNG","CMN","18:30","19:30","Scheduled","PAX"),
];



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
