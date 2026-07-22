/** Format ISO / date string for list display (Asia/Shanghai friendly local). */
export function formatDisplayDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = formatDisplayDate(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

/** Today as YYYY-MM-DD in local timezone. */
export function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Display YYYY-MM-DD as 中文年月日（picker 取值仍用 ISO 日期串） */
export function formatChineseDate(dateInput?: string | null): string {
  if (!dateInput) return '请选择日期';
  const part = dateInput.includes('T')
    ? formatDisplayDate(dateInput)
    : dateInput;
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return dateInput;
  return `${y}年${m}月${d}日`;
}

/** Display HH:mm as 中文时分 */
export function formatChineseTime(timeInput?: string | null): string {
  if (!timeInput) return '请选择时间';
  const [hh, mm] = timeInput.split(':');
  if (hh == null || mm == null) return timeInput;
  return `${Number(hh)}时${String(mm).padStart(2, '0')}分`;
}

/**
 * Convert date picker value (YYYY-MM-DD) to ISO8601 for backend isISO8601().
 * Uses local noon to reduce timezone day-shift surprises.
 */
export function dateInputToIso(dateInput: string): string {
  if (!dateInput) return '';
  if (dateInput.includes('T')) return new Date(dateInput).toISOString();
  const [y, m, d] = dateInput.split('-').map(Number);
  if (!y || !m || !d) return dateInput;
  const local = new Date(y, m - 1, d, 12, 0, 0);
  return local.toISOString();
}
