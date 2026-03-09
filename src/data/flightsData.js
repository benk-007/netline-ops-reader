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
    "L10", "AT333", "CN-RGX", "B737-800", "PAX",
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
