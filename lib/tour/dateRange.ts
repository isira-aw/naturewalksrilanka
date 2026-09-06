/** Travel dates as ISO `YYYY-MM-DD` strings, or `null` while still unanswered. */
export type DateRangeValue = { start: string | null; end: string | null };

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Nights are what a traveller counts; days is nights + 1. */
export function countDays(range: DateRangeValue): number {
  if (!range.start || !range.end) return 0;
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff >= 0 ? diff + 1 : 0;
}

export function isValidRange(range: DateRangeValue): boolean {
  return Boolean(range.start && range.end && range.start <= range.end);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Monday-first calendar grid for the month containing `date`, padded with leading/trailing days. */
export function buildMonthGrid(date: Date): Date[] {
  const first = startOfMonth(date);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstWeekday = (first.getDay() + 6) % 7; // 0 = Monday

  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);

  const rows = Math.ceil((firstWeekday + lastDayOfMonth) / 7);
  return Array.from({ length: rows * 7 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

/** True when `iso` falls inside the selected range (endpoints excluded). */
export function isBetween(iso: string, range: DateRangeValue): boolean {
  if (!range.start || !range.end) return false;
  return iso > range.start && iso < range.end;
}
