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
  }}

export const legs = [

  new Leg(
    "L10","AT333","CN-RGX","B737-800","PAX",
    "MAD","CMN","14:15","16:00","15:15","17:00",
    "Scheduled",0,"Plan","Plan","Plan","NS","2026-03-05"
  ),

  new Leg(
    "L11","AT201","CN-RGA","B737-800","PAX",
    "CMN","CDG","08:00","10:30","09:00","11:30",
    "Scheduled",0,"Plan","Plan","Plan","NS","2026-03-05"
  ),

  new Leg(
    "L12","AT202","CN-RGA","B737-800","PAX",
    "CDG","CMN","11:30","14:00","12:30","15:00",
    "Scheduled",0,"Plan","Plan","Plan","NS","2026-03-05"
  ),

  new Leg(
    "L13","AT401","CN-RGB","B737-800","PAX",
    "CMN","MAD","09:00","10:45","10:00","11:45",
    "Scheduled",0,"Plan","Plan","Plan","NS","2026-03-05"
  ),

  new Leg(
    "L14","AT550","CN-RGC","B737-800","PAX",
    "CMN","LIS","07:00","09:30","08:00","10:30",
    "Scheduled",0,"Plan","Plan","Plan","NS","2026-03-05"
  ),

  new Leg(
    "L15","AT551","CN-RGC","B737-800","PAX",
    "LIS","CMN","10:30","13:00","11:30","14:00",
    "Scheduled",0,"Plan","Plan","Plan","NS","2026-03-05"
  )
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
