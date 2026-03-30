export function normalizeDate(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + num * 86400000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  let str = String(val).trim().replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim();
  const parts = str.split(/[/\-.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  }
  return str || null;
}

export function normalizeTime(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val.trim())) {
    return val.trim().slice(0, 5).padStart(5, '0');
  }
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  const num = Number(val);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMinutes = Math.round(num * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
  if (!isNaN(num) && num >= 1 && num < 24) {
    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return String(val).trim() || null;
}

/** Returns an array of YYYY-MM-DD strings for the Gantt window.
 *  dayCount=1 → [referenceDate]
 *  dayCount=2 → [referenceDate, referenceDate+1]
 *  dayCount=3 → [referenceDate-1, referenceDate, referenceDate+1]
 */
export function getGanttWindowDates(referenceDate, dayCount) {
  const ref = new Date(referenceDate + 'T00:00:00');
  if (dayCount === 1) {
    return [referenceDate];
  }
  if (dayCount === 2) {
    const d1 = new Date(ref);
    d1.setDate(d1.getDate() + 1);
    return [referenceDate, d1.toLocaleDateString('en-CA')];
  }
  const dm1 = new Date(ref);
  dm1.setDate(dm1.getDate() - 1);
  const dp1 = new Date(ref);
  dp1.setDate(dp1.getDate() + 1);
  return [dm1.toLocaleDateString('en-CA'), referenceDate, dp1.toLocaleDateString('en-CA')];
}
