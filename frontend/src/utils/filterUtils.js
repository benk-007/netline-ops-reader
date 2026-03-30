export function applyFilters(legs, filters) {
  const { fDate, fService, fDep, fArr, fFlight, fSubtype } = filters || {};
  const toArr = v => (Array.isArray(v) ? v : []);
  return legs.filter(leg => {
    if (toArr(fDate).length > 0    && !toArr(fDate).includes(leg.date))       return false;
    if (toArr(fService).length > 0 && !toArr(fService).includes(leg.service)) return false;
    if (toArr(fDep).length > 0     && !toArr(fDep).includes(leg.dep))         return false;
    if (toArr(fArr).length > 0     && !toArr(fArr).includes(leg.arr))         return false;
    if (toArr(fSubtype).length > 0 && !toArr(fSubtype).includes(leg.subtype)) return false;
    if (fFlight && !leg.fn.toLowerCase().includes(fFlight.toLowerCase()))      return false;
    return true;
  });
}
