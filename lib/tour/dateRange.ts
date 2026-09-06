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
