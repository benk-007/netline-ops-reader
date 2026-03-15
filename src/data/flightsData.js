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
   ═══════════════════════════════════════════════════════════════ */
export const legs = [

  /* ── CN-RHB  B737-800 ─────────────────────────────── */
  new Leg({ LEG_NO: "L001", FN_CARRIER: "AT", FN_NUMBER: "302",  AC_REGISTRATION: "CN-RHB", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "BCN", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "08:00", ARR_TIME_SCHED: "10:40",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "07:55", AIRBORNE_TIME: "08:10", LANDING_TIME: "10:35", ON_BLOCK_TIME: "10:42",
  }),
  new Leg({ LEG_NO: "L002", FN_CARRIER: "AT", FN_NUMBER: "303",  AC_REGISTRATION: "CN-RHB", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "BCN", DEP_TIME_SCHED: "08:30", ARR_TIME_SCHED: "11:40",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RHC  B737-800 ─────────────────────────────── */
  new Leg({ LEG_NO: "L003", FN_CARRIER: "AT", FN_NUMBER: "411",  AC_REGISTRATION: "CN-RHC", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "MAD", DEP_TIME_SCHED: "07:10", ARR_TIME_SCHED: "08:50",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "07:12", AIRBORNE_TIME: "07:22", LANDING_TIME: "08:48", ON_BLOCK_TIME: "08:55",
  }),
  new Leg({ LEG_NO: "L004", FN_CARRIER: "AT", FN_NUMBER: "412",  AC_REGISTRATION: "CN-RHC", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "MAD", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "10:30", ARR_TIME_SCHED: "12:10",
    LEG_STATE: "Airborne",  LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "10:35", AIRBORNE_TIME: "10:45",
  }),

  /* ── CN-RHD  B737-800 Cargo ───────────────────────── */
  new Leg({ LEG_NO: "L005", FN_CARRIER: "AT", FN_NUMBER: "221",  AC_REGISTRATION: "CN-RHD", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "FRA", DEP_TIME_SCHED: "03:00", ARR_TIME_SCHED: "07:30",
    LEG_STATE: "Arrived",   LEG_TYPE: "Cargo", DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "03:02", AIRBORNE_TIME: "03:14", LANDING_TIME: "07:28", ON_BLOCK_TIME: "07:35",
  }),
  new Leg({ LEG_NO: "L006", FN_CARRIER: "AT", FN_NUMBER: "222",  AC_REGISTRATION: "CN-RHD", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "FRA", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "10:00", ARR_TIME_SCHED: "14:30",
    LEG_STATE: "Airborne",  LEG_TYPE: "Cargo", DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "10:05", AIRBORNE_TIME: "10:18",
  }),

  /* ── CN-RHE  B737-800 Charter ─────────────────────── */
  new Leg({ LEG_NO: "L007", FN_CARRIER: "AT", FN_NUMBER: "510",  AC_REGISTRATION: "CN-RHE", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "IST", DEP_TIME_SCHED: "08:30", ARR_TIME_SCHED: "13:00",
    LEG_STATE: "Delayed",   LEG_TYPE: "Charter", DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "71",    DELAY_TIME_01: 35,
    OFF_BLOCK_TIME: "09:05", AIRBORNE_TIME: "09:18",
  }),
  new Leg({ LEG_NO: "L008", FN_CARRIER: "AT", FN_NUMBER: "511",  AC_REGISTRATION: "CN-RHE", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "IST", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "16:00", ARR_TIME_SCHED: "20:30",
    LEG_STATE: "Scheduled", LEG_TYPE: "Charter", DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RHF  B737-800 ─────────────────────────────── */
  new Leg({ LEG_NO: "L009", FN_CARRIER: "AT", FN_NUMBER: "620",  AC_REGISTRATION: "CN-RHF", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "BRU", DEP_TIME_SCHED: "07:00", ARR_TIME_SCHED: "10:20",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "07:03", AIRBORNE_TIME: "07:15", LANDING_TIME: "10:18", ON_BLOCK_TIME: "10:25",
  }),
  new Leg({ LEG_NO: "L010", FN_CARRIER: "AT", FN_NUMBER: "621",  AC_REGISTRATION: "CN-RHF", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "BRU", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "12:00", ARR_TIME_SCHED: "15:20",
    LEG_STATE: "Delayed",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "93",    DELAY_TIME_01: 55,
  }),

  /* ── CN-ROA  B787-9 longhaul ──────────────────────── */
  new Leg({ LEG_NO: "L011", FN_CARRIER: "AT", FN_NUMBER: "201",  AC_REGISTRATION: "CN-ROA", AC_SUBTYPE: "B787-9",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "JFK", DEP_TIME_SCHED: "01:15", ARR_TIME_SCHED: "09:40",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "01:18", AIRBORNE_TIME: "01:30", LANDING_TIME: "09:38", ON_BLOCK_TIME: "09:45",
  }),
  new Leg({ LEG_NO: "L012", FN_CARRIER: "AT", FN_NUMBER: "202",  AC_REGISTRATION: "CN-ROA", AC_SUBTYPE: "B787-9",
    DEP_AP_SCHED: "JFK", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "14:30", ARR_TIME_SCHED: "04:20",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-ROB  B787-8 ───────────────────────────────── */
  new Leg({ LEG_NO: "L013", FN_CARRIER: "AT", FN_NUMBER: "603",  AC_REGISTRATION: "CN-ROB", AC_SUBTYPE: "B787-8",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "CDG", DEP_TIME_SCHED: "06:00", ARR_TIME_SCHED: "09:30",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "06:02", AIRBORNE_TIME: "06:14", LANDING_TIME: "09:28", ON_BLOCK_TIME: "09:35",
  }),
  new Leg({ LEG_NO: "L014", FN_CARRIER: "AT", FN_NUMBER: "604",  AC_REGISTRATION: "CN-ROB", AC_SUBTYPE: "B787-8",
    DEP_AP_SCHED: "CDG", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "11:45", ARR_TIME_SCHED: "15:15",
    LEG_STATE: "Airborne",  LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "11:48", AIRBORNE_TIME: "12:00",
  }),

  /* ── CN-ROC  B737-800 Maghreb ─────────────────────── */
  new Leg({ LEG_NO: "L015", FN_CARRIER: "AT", FN_NUMBER: "401",  AC_REGISTRATION: "CN-ROC", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "TUN", DEP_TIME_SCHED: "07:00", ARR_TIME_SCHED: "09:05",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "07:05", AIRBORNE_TIME: "07:18", LANDING_TIME: "09:02", ON_BLOCK_TIME: "09:08",
  }),
  new Leg({ LEG_NO: "L016", FN_CARRIER: "AT", FN_NUMBER: "402",  AC_REGISTRATION: "CN-ROC", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "TUN", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "10:30", ARR_TIME_SCHED: "12:35",
    LEG_STATE: "Delayed",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "15",    DELAY_TIME_01: 28,
  }),
  new Leg({ LEG_NO: "L017", FN_CARRIER: "AT", FN_NUMBER: "403",  AC_REGISTRATION: "CN-ROC", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "ALG", DEP_TIME_SCHED: "15:00", ARR_TIME_SCHED: "16:50",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RGA  B737-800 domestic ────────────────────── */
  new Leg({ LEG_NO: "L018", FN_CARRIER: "AT", FN_NUMBER: "501",  AC_REGISTRATION: "CN-RGA", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "AGA", DEP_TIME_SCHED: "07:30", ARR_TIME_SCHED: "08:25",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "07:32", AIRBORNE_TIME: "07:42", LANDING_TIME: "08:23", ON_BLOCK_TIME: "08:28",
  }),
  new Leg({ LEG_NO: "L019", FN_CARRIER: "AT", FN_NUMBER: "502",  AC_REGISTRATION: "CN-RGA", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "AGA", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "09:15", ARR_TIME_SCHED: "10:10",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "09:18", AIRBORNE_TIME: "09:28", LANDING_TIME: "10:08", ON_BLOCK_TIME: "10:14",
  }),
  new Leg({ LEG_NO: "L020", FN_CARRIER: "AT", FN_NUMBER: "503",  AC_REGISTRATION: "CN-RGA", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "OUD", DEP_TIME_SCHED: "12:00", ARR_TIME_SCHED: "13:20",
    LEG_STATE: "Boarding",  LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "89",    DELAY_TIME_01: 5,
  }),

  /* ── CN-RGB  B787-9 Charter ───────────────────────── */
  new Leg({ LEG_NO: "L021", FN_CARRIER: "AT", FN_NUMBER: "711",  AC_REGISTRATION: "CN-RGB", AC_SUBTYPE: "B787-9",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "IST", DEP_TIME_SCHED: "08:00", ARR_TIME_SCHED: "12:15",
    LEG_STATE: "Airborne",  LEG_TYPE: "Charter", DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "08:04", AIRBORNE_TIME: "08:15",
  }),
  new Leg({ LEG_NO: "L022", FN_CARRIER: "AT", FN_NUMBER: "712",  AC_REGISTRATION: "CN-RGB", AC_SUBTYPE: "B787-9",
    DEP_AP_SCHED: "IST", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "14:30", ARR_TIME_SCHED: "18:45",
    LEG_STATE: "Scheduled", LEG_TYPE: "Charter", DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RGS  ATR72-600 regional ───────────────────── */
  new Leg({ LEG_NO: "L023", FN_CARRIER: "AT", FN_NUMBER: "301",  AC_REGISTRATION: "CN-RGS", AC_SUBTYPE: "ATR72-600",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "RAK", DEP_TIME_SCHED: "08:00", ARR_TIME_SCHED: "09:05",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "08:02", AIRBORNE_TIME: "08:12", LANDING_TIME: "09:03", ON_BLOCK_TIME: "09:08",
  }),
  new Leg({ LEG_NO: "L024", FN_CARRIER: "AT", FN_NUMBER: "302",  AC_REGISTRATION: "CN-RGS", AC_SUBTYPE: "ATR72-600",
    DEP_AP_SCHED: "RAK", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "09:45", ARR_TIME_SCHED: "10:50",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "09:53", AIRBORNE_TIME: "10:02", LANDING_TIME: "10:48", ON_BLOCK_TIME: "10:53",
    DELAY_CODE_01: "93",    DELAY_TIME_01: 8,
  }),
  new Leg({ LEG_NO: "L025", FN_CARRIER: "AT", FN_NUMBER: "303",  AC_REGISTRATION: "CN-RGS", AC_SUBTYPE: "ATR72-600",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "FES", DEP_TIME_SCHED: "13:00", ARR_TIME_SCHED: "13:40",
    LEG_STATE: "Delayed",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "15",    DELAY_TIME_01: 20,
  }),

  /* ── CN-RNT  ATR72-600 domestic ───────────────────── */
  new Leg({ LEG_NO: "L026", FN_CARRIER: "AT", FN_NUMBER: "910",  AC_REGISTRATION: "CN-RNT", AC_SUBTYPE: "ATR72-600",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "RAK", DEP_TIME_SCHED: "11:30", ARR_TIME_SCHED: "12:40",
    LEG_STATE: "Boarding",  LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "89",    DELAY_TIME_01: 12,
  }),
  new Leg({ LEG_NO: "L027", FN_CARRIER: "AT", FN_NUMBER: "911",  AC_REGISTRATION: "CN-RNT", AC_SUBTYPE: "ATR72-600",
    DEP_AP_SCHED: "RAK", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "14:00", ARR_TIME_SCHED: "15:10",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RNQ  B737-800 Cargo ───────────────────────── */
  new Leg({ LEG_NO: "L028", FN_CARRIER: "AT", FN_NUMBER: "901",  AC_REGISTRATION: "CN-RNQ", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "CAI", DEP_TIME_SCHED: "17:00", ARR_TIME_SCHED: "21:45",
    LEG_STATE: "Scheduled", LEG_TYPE: "Cargo", DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-ROQ  B737-800 ─────────────────────────────── */
  new Leg({ LEG_NO: "L029", FN_CARRIER: "AT", FN_NUMBER: "305",  AC_REGISTRATION: "CN-ROQ", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "DXB", DEP_TIME_SCHED: "02:00", ARR_TIME_SCHED: "09:30",
    LEG_STATE: "Arrived",   LEG_TYPE: "Cargo", DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "02:03", AIRBORNE_TIME: "02:15", LANDING_TIME: "09:28", ON_BLOCK_TIME: "09:35",
  }),
  new Leg({ LEG_NO: "L030", FN_CARRIER: "AT", FN_NUMBER: "520",  AC_REGISTRATION: "CN-ROQ", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "DXB", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "14:00", ARR_TIME_SCHED: "18:00",
    LEG_STATE: "Scheduled", LEG_TYPE: "Charter", DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-ROP  B787-9 longhaul ──────────────────────── */
  new Leg({ LEG_NO: "L031", FN_CARRIER: "AT", FN_NUMBER: "701",  AC_REGISTRATION: "CN-ROP", AC_SUBTYPE: "B787-9",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "CDG", DEP_TIME_SCHED: "06:15", ARR_TIME_SCHED: "09:45",
    LEG_STATE: "Arrived",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "06:18", AIRBORNE_TIME: "06:30", LANDING_TIME: "09:43", ON_BLOCK_TIME: "09:50",
  }),
  new Leg({ LEG_NO: "L032", FN_CARRIER: "AT", FN_NUMBER: "702",  AC_REGISTRATION: "CN-ROP", AC_SUBTYPE: "B787-9",
    DEP_AP_SCHED: "CDG", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "13:00", ARR_TIME_SCHED: "16:30",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RNP  B787-8 ───────────────────────────────── */
  new Leg({ LEG_NO: "L033", FN_CARRIER: "AT", FN_NUMBER: "803",  AC_REGISTRATION: "CN-RNP", AC_SUBTYPE: "B787-8",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "LHR", DEP_TIME_SCHED: "07:30", ARR_TIME_SCHED: "11:15",
    LEG_STATE: "Delayed",   LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "71",    DELAY_TIME_01: 45,
    OFF_BLOCK_TIME: "08:15", AIRBORNE_TIME: "08:28",
  }),
  new Leg({ LEG_NO: "L034", FN_CARRIER: "AT", FN_NUMBER: "804",  AC_REGISTRATION: "CN-RNP", AC_SUBTYPE: "B787-8",
    DEP_AP_SCHED: "LHR", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "15:00", ARR_TIME_SCHED: "18:45",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RHG  B737-800 Cancelled ───────────────────── */
  new Leg({ LEG_NO: "L035", FN_CARRIER: "AT", FN_NUMBER: "771",  AC_REGISTRATION: "CN-RHG", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "DKR", DEP_TIME_SCHED: "10:00", ARR_TIME_SCHED: "14:30",
    LEG_STATE: "Cancelled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    DELAY_CODE_01: "89",    DELAY_TIME_01: 0,
  }),

  /* ── CN-RHH  Ferry ────────────────────────────────── */
  new Leg({ LEG_NO: "L036", FN_CARRIER: "AT", FN_NUMBER: "099",  AC_REGISTRATION: "CN-RHH", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "TNG", DEP_TIME_SCHED: "06:30", ARR_TIME_SCHED: "07:15",
    LEG_STATE: "Arrived",   LEG_TYPE: "Ferry", DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "06:32", AIRBORNE_TIME: "06:42", LANDING_TIME: "07:13", ON_BLOCK_TIME: "07:18",
  }),
  new Leg({ LEG_NO: "L037", FN_CARRIER: "AT", FN_NUMBER: "098",  AC_REGISTRATION: "CN-RHH", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "TNG", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "13:00", ARR_TIME_SCHED: "13:45",
    LEG_STATE: "Scheduled", LEG_TYPE: "Maintenance", DAY_OF_ORIGIN: "2026-03-05",
  }),

  /* ── CN-RHA  B737-800 GVA / FCO ───────────────────── */
  new Leg({ LEG_NO: "L038", FN_CARRIER: "AT", FN_NUMBER: "451",  AC_REGISTRATION: "CN-RHA", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "FCO", DEP_TIME_SCHED: "09:30", ARR_TIME_SCHED: "13:10",
    LEG_STATE: "Airborne",  LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
    OFF_BLOCK_TIME: "09:33", AIRBORNE_TIME: "09:45",
  }),
  new Leg({ LEG_NO: "L039", FN_CARRIER: "AT", FN_NUMBER: "452",  AC_REGISTRATION: "CN-RHA", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "FCO", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "15:00", ARR_TIME_SCHED: "18:40",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),
  new Leg({ LEG_NO: "L040", FN_CARRIER: "AT", FN_NUMBER: "601",  AC_REGISTRATION: "CN-RHA", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "CMN", ARR_AP_SCHED: "GVA", DEP_TIME_SCHED: "19:30", ARR_TIME_SCHED: "23:00",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),
  new Leg({ LEG_NO: "L041", FN_CARRIER: "AT", FN_NUMBER: "602",  AC_REGISTRATION: "CN-RHA", AC_SUBTYPE: "B737-800",
    DEP_AP_SCHED: "GVA", ARR_AP_SCHED: "CMN", DEP_TIME_SCHED: "20:45", ARR_TIME_SCHED: "22:15",
    LEG_STATE: "Scheduled", LEG_TYPE: "PAX",   DAY_OF_ORIGIN: "2026-03-05",
  }),

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
