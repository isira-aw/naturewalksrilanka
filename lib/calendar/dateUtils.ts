export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

/** Monday-first 6-row calendar grid for the month containing `date`, including leading/trailing days. */
export function buildMonthGrid(date: Date): Date[] {
  const first = startOfMonth(date);
  const last = endOfMonth(date);
  const firstWeekday = (first.getDay() + 6) % 7; // 0 = Monday
  const totalCells = 42;

  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  const usedRows = Math.ceil((firstWeekday + last.getDate()) / 7);
  return days.slice(0, usedRows * 7);
}

export function isWithinRange(date: Date, rangeStart: string, rangeEnd: string): boolean {
  const iso = toISODate(date);
  return iso >= rangeStart.slice(0, 10) && iso < rangeEnd.slice(0, 10);
}
