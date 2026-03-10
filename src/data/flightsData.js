import { DataSet } from "vis-data";
class Leg {
  constructor(
    id,
    fn,
    reg,
    subtype,
    service,
    dep,
    arr,
    depUtc,
    arrUtc,
    depLocal,
    arrLocal,
    state,
    delay,
    fuel,
    catering,
    cleaning,
    loadsheet,
    date
  ) {
    this.id = id;
    this.fn = fn;
    this.reg = reg;
    this.subtype = subtype;
    this.service = service;
    this.dep = dep;
    this.arr = arr;
    this.depUtc = depUtc;
    this.arrUtc = arrUtc;
    this.depLocal = depLocal;
    this.arrLocal = arrLocal;
    this.state = state;
    this.delay = delay;
    this.fuel = fuel;
    this.catering = catering;
    this.cleaning = cleaning;
    this.loadsheet = loadsheet;
    this.date = date;
  }
}
class Groups {
  constructor(id, content) {
    this.id = id;
    this.content = content;
  }
}
class Items {
  constructor(id, group, content, start, end) {
    this.id = id;
    this.group = group;
    this.content = content;
    this.start = start;
    this.end = end;
  }
}

export const legs = [
  new Leg(
    "L33", "AT301", "CN-RHB", "B737-800", "PAX",
    "CMN", "BCN", "06:00", "07:40", "07:00", "08:40",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L34", "AT302", "CN-RHB", "B737-800", "PAX",
    "BCN", "CMN", "09:00", "10:40", "10:00", "11:40",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L35", "AT411", "CN-RHC", "B737-800", "PAX",
    "CMN", "MAD", "07:10", "08:50", "08:10", "09:50",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L36", "AT412", "CN-RHC", "B737-800", "PAX",
    "MAD", "CMN", "10:00", "11:40", "11:00", "12:40",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L37", "AT221", "CN-RHD", "B737-800", "Cargo",
    "CMN", "DSS", "05:50", "09:20", "06:50", "10:20",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L38", "AT222", "CN-RHD", "B737-800", "Cargo",
    "DSS", "CMN", "11:00", "14:30", "12:00", "15:30",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L39", "AT510", "CN-RHE", "B737-800", "Charter",
    "CMN", "IST", "08:30", "13:00", "09:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L40", "AT511", "CN-RHE", "B737-800", "Charter",
    "IST", "CMN", "15:30", "20:00", "16:30", "21:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L41", "AT620", "CN-RHF", "B737-800", "PAX",
    "CMN", "BRU", "07:00", "10:20", "08:00", "11:20",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L42", "AT621", "CN-RHF", "B737-800", "PAX",
    "BRU", "CMN", "12:00", "15:20", "13:00", "16:20",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L43", "AT440", "CN-RHG", "B737-800", "Cargo",
    "CMN", "ALG", "06:40", "08:00", "07:40", "09:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L44", "AT441", "CN-RHG", "B737-800", "Cargo",
    "ALG", "CMN", "09:40", "11:00", "10:40", "12:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L45", "AT701", "CN-RHH", "B737-800", "PAX",
    "CMN", "FCO", "06:30", "09:50", "07:30", "10:50",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L46", "AT702", "CN-RHH", "B737-800", "PAX",
    "FCO", "CMN", "11:20", "14:40", "12:20", "15:40",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L47", "AT330", "CN-RHI", "B737-800", "PAX",
    "CMN", "LHR", "09:00", "12:20", "10:00", "13:20",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L48", "AT331", "CN-RHI", "B737-800", "PAX",
    "LHR", "CMN", "14:00", "17:20", "15:00", "18:20",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L49", "AT560", "CN-RHJ", "B737-800", "Ferry",
    "CMN", "RBA", "18:30", "19:20", "19:30", "20:20",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L50", "AT561", "CN-RHJ", "B737-800", "PAX",
    "RBA", "CMN", "21:00", "21:50", "22:00", "22:50",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L51", "AT880", "CN-RHK", "B737-800", "Cargo",
    "CMN", "CAI", "04:50", "10:10", "05:50", "11:10",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L52", "AT881", "CN-RHK", "B737-800", "Cargo",
    "CAI", "CMN", "12:20", "17:40", "13:20", "18:40",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L53", "AT410", "CN-RHL", "B737-800", "PAX",
    "CMN", "BCN", "12:00", "13:40", "13:00", "14:40",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L54", "AT411", "CN-RHL", "B737-800", "PAX",
    "BCN", "CMN", "15:10", "16:50", "16:10", "17:50",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L55", "AT650", "CN-RHM", "B737-800", "Charter",
    "CMN", "ATH", "07:50", "12:20", "08:50", "13:20",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L56", "AT651", "CN-RHM", "B737-800", "Charter",
    "ATH", "CMN", "14:30", "19:00", "15:30", "20:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L57", "AT720", "CN-RHN", "B737-800", "PAX",
    "CMN", "FRA", "10:10", "13:40", "11:10", "14:40",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L58", "AT333", "CN-RGX", "B737-800", "PAX",
    "MAD", "CMN", "14:15", "16:00", "15:15", "17:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L11", "AT201", "CN-RGA", "B737-800", "PAX",
    "CMN", "CDG", "08:00", "10:30", "09:00", "11:30",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L12", "AT202", "CN-RGA", "B737-800", "PAX",
    "CDG", "CMN", "11:30", "14:00", "12:30", "15:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L13", "AT401", "CN-RGB", "B737-800", "PAX",
    "CMN", "MAD", "09:00", "10:45", "10:00", "11:45",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L14", "AT550", "CN-RGCAF", "B737-800", "PAX",
    "CMN", "LIS", "07:00", "09:30", "08:00", "10:30",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),

  new Leg(
    "L15", "AT551", "CN-RGCBBB", "B737-800", "PAX",
    "LIS", "CMN", "11:30", "19:00", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  )
  ,
  new Leg(
    "L16", "AT551", "CN-RGCBB", "B737-800", "Cargo",
    "LIS", "CMN", "08:30", "09:10", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L17", "AT551", "CN-RGCB", "B737-800", "PAX",
    "LIS", "CMN", "11:30", "13:30", "10:40", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L18", "AT551", "CN-RGC", "B737-800", "PAX",
    "LIS", "CMN", "12:30", "18:00", "11:40", "13:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L19", "AT551", "CN-RGC", "B737-800", "Cargo",
    "LIS", "CMN", "07:30", "09:00", "10:30", "13:30",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L20", "AT551", "CN-RGBC", "B737-800", "Ferry",
    "LIS", "CMN", "11:30", "12:30", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L21", "AT551", "CN-RGC", "B737-800", "PAX",
    "LIS", "CMN", "10:30", "13:00", "15:30", "19:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L22", "AT551", "CN-RGCT", "B737-800", "CARGO",
    "LIS", "CMN", "09:30", "10:20", "13:30", "18:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L23", "AT551", "CN-RGCL", "B737-800", "PAX",
    "LIS", "CMN", "08:30", "11:00", "08:30", "16:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L24", "AT551", "CN-RGCD", "B737-800", "PAX",
    "LIS", "CMN", "07:30", "10:00", "10:30", "13:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L25", "AT551", "CN-RGCDD", "B737-800", "PAX",
    "LIS", "CMN", "12:30", "13:00", "12:30", "10:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L26", "AT551", "CN-RGDOC", "B737-800", "PAX",
    "LIS", "CMN", "11:30", "13:00", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L27", "AT551", "CN-RDC", "B737-800", "PAX",
    "LIS", "CMN", "10:30", "16:00", "12:30", "15:30",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L28", "AT551", "CN-RGCc", "B737-800", "CARGO",
    "LIS", "CMN", "11:30", "13:00", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L29", "AT551", "CN-RGr", "B737-800", "PAX",
    "LIS", "CMN", "14:30", "19:00", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L30", "AT551", "CN-RGa", "B737-800", "PAX",
    "LIS", "CMN", "15:30", "18:00", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L31", "AT551", "CN-RGv", "B737-800", "PAX",
    "LIS", "CMN", "17:30", "19:00", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
  new Leg(
    "L32", "AT551", "CN-RGC", "B737-800", "PAX",
    "LIS", "CMN", "12:30", "16:00", "11:30", "14:00",
    "Scheduled", 0, "Plan", "Plan", "Plan", "NS", "2026-03-05"
  ),
];
const uniqueRegs = [...new Set(legs.map(l => l.reg))];

export const groups = new DataSet(
  uniqueRegs.map(reg => new Groups(reg, reg))
);

export const items = new DataSet(

  legs.map((leg, index) =>
    new Items(
      index + 1,
      leg.reg,
      `${leg.fn} ${leg.dep} → ${leg.arr}`,
      `${leg.date}T${leg.depUtc}:00`,
      `${leg.date}T${leg.arrUtc}:00`
    )
  )

);
export const dates = [...new Set(legs.map(l => l.date))].sort();
