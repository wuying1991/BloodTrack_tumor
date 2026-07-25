/** Local calendar helpers (YYYY-MM-DD keys). */

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/** Local date key from ISO / date string. */
export function isoToLocalDateKey(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return toDateKey(d);
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${year}年${monthIndex + 1}月`;
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function monthIsoRange(
  year: number,
  monthIndex: number
): { startDate: string; endDate: string } {
  return {
    startDate: new Date(year, monthIndex, 1, 0, 0, 0, 0).toISOString(),
    endDate: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).toISOString(),
  };
}

export interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/**
 * Build a 6x7 grid starting Monday (common CN medical apps).
 * monthIndex: 0-11
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const first = new Date(year, monthIndex, 1);
  // Mon=0 ... Sun=6
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();
  const todayKey = toDateKey(new Date());

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    const day = prevMonthDays - firstWeekday + 1 + i;
    const d = new Date(year, monthIndex - 1, day);
    const key = toDateKey(d);
    cells.push({ key, day, inMonth: false, isToday: key === todayKey });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const key = toDateKey(d);
    cells.push({ key, day, inMonth: true, isToday: key === todayKey });
  }

  while (cells.length % 7 !== 0 || cells.length < 42) {
    const day = cells.length - (firstWeekday + daysInMonth) + 1;
    const d = new Date(year, monthIndex + 1, day);
    const key = toDateKey(d);
    cells.push({ key, day: d.getDate(), inMonth: false, isToday: key === todayKey });
    if (cells.length >= 42) break;
  }

  return cells;
}

/** Inclusive local date keys from start..end ISO. Cap span for safety. */
export function eachDateKeyInRange(
  startIso: string,
  endIso: string,
  maxDays = 120
): string[] {
  const start = parseDateKey(isoToLocalDateKey(startIso));
  const end = parseDateKey(isoToLocalDateKey(endIso));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const keys: string[] = [];
  const cur = new Date(start);
  let n = 0;
  while (cur.getTime() <= end.getTime() && n < maxDays) {
    keys.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
    n += 1;
  }
  return keys;
}
