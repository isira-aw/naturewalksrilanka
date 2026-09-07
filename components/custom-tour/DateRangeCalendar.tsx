"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  addMonths,
  buildMonthGrid,
  countDays,
  isBetween,
  startOfToday,
  toISODate,
  type DateRangeValue,
} from "@/lib/tour/dateRange";

export type CalendarLabels = {
  start: string;
  end: string;
  hint: string;
  previousMonth: string;
  nextMonth: string;
  clear: string;
  selectedRange: string;
};

/**
 * Month-grid range picker for the custom-tour wizard. Purely a date chooser:
 * every journey is staffed from the company's own certified guides, so no day
 * is ever "unavailable" and there is nothing to look up before answering.
 *
 * Click once to set the arrival, again to set the departure; a click on or
 * before the arrival starts a fresh range. Desktop shows two months at once —
 * most journeys here run 10 to 18 days, so a single month would force paging
 * mid-selection. Mobile keeps one month at full width for thumb-sized targets.
 */
export function DateRangeCalendar({
  locale,
  value,
  onChange,
  labels,
}: {
  locale: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  labels: CalendarLabels;
}) {
  const today = useMemo(() => startOfToday(), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  /* Hovering a day previews the range it would create, so the second click is
     never a guess about which nights are included. */
  const [hovered, setHovered] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const todayIso = toISODate(today);
  const previewRange: DateRangeValue =
    value.start && !value.end && hovered && hovered > value.start
      ? { start: value.start, end: hovered }
      : value;

  const atFirstAllowedMonth =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    });
  }, [locale]);

  function formatLong(iso: string) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));
  }

  /** Chip format — no year, so it never truncates in a narrow field. */
  function formatShort(iso: string) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(`${iso}T00:00:00`));
  }

  function handleDayClick(iso: string) {
    if (!value.start || value.end || iso <= value.start) {
      onChange({ start: iso, end: null });
      return;
    }
    onChange({ start: value.start, end: iso });
  }

  /** Arrow keys walk the grid a day or a week at a time, across month edges. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const offset = offsets[event.key];
    if (!offset) return;

    const focused = document.activeElement as HTMLElement | null;
    const iso = focused?.dataset?.date;
    if (!iso || !gridRef.current?.contains(focused)) return;

    event.preventDefault();
    const target = new Date(`${iso}T00:00:00`);
    target.setDate(target.getDate() + offset);
    const targetIso = toISODate(target);
    if (targetIso < todayIso) return;

    const cell = gridRef.current.querySelector<HTMLButtonElement>(`[data-date="${targetIso}"]`);
    if (cell) {
      cell.focus();
      return;
    }
    // The day is in a month that isn't rendered yet — page there, then focus it.
    setVisibleMonth((m) => addMonths(m, offset > 0 ? 1 : -1));
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${targetIso}"]`)
        ?.focus();
    });
  }

  const nights = countDays(value);

  return (
    <div className="rounded-2xl border border-stone-dark bg-warm-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <NavButton
          label={labels.previousMonth}
          disabled={atFirstAllowedMonth}
          onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
          direction="prev"
        />
        <p className="font-display text-lg text-charcoal md:hidden">
          <MonthName date={visibleMonth} locale={locale} />
        </p>
        <NavButton
          label={labels.nextMonth}
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          direction="next"
        />
      </div>

      <div
        ref={gridRef}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHovered(null)}
        className="mt-2 grid gap-x-10 gap-y-8 md:grid-cols-2"
      >
        {[0, 1].map((monthOffset) => {
          const month = addMonths(visibleMonth, monthOffset);
          return (
            <div
              key={monthOffset}
              /* The second month is desktop-only; on mobile it would double the
                 scroll for no gain when only one month fits at a time. */
              className={monthOffset === 1 ? "hidden md:block" : undefined}
            >
              <p className="hidden text-center font-display text-lg text-charcoal md:-mt-8 md:block">
                <MonthName date={month} locale={locale} />
              </p>

              <div className="mt-3 grid grid-cols-7 text-center font-utility text-[11px] uppercase tracking-wide text-charcoal/45">
                {weekdayLabels.map((weekday, i) => (
                  <div key={i} className="pb-2">
                    {weekday}
                  </div>
                ))}
              </div>

              <div role="grid" aria-label={monthLabel(month, locale)} className="grid grid-cols-7">
                {buildMonthGrid(month).map((day) => {
                  const iso = toISODate(day);
                  if (day.getMonth() !== month.getMonth()) {
                    return <div key={iso} aria-hidden="true" />;
                  }

                  const isPast = iso < todayIso;
                  const isStart = iso === previewRange.start;
                  const isEnd = iso === previewRange.end;
                  const isInside = isBetween(iso, previewRange);
                  const isEndpoint = isStart || isEnd;
                  const inBand = isInside || (isEndpoint && Boolean(previewRange.end));

                  return (
                    <div
                      key={iso}
                      /* The band is painted on the wrapper so a selected range
                         reads as one ribbon rather than separate circles, and
                         is rounded off at row ends. */
                      className={cn(
                        "relative py-0.5 [&:nth-child(7n)]:rounded-r-full [&:nth-child(7n+1)]:rounded-l-full",
                        inBand && "bg-forest/10",
                        isStart && previewRange.end && "rounded-l-full",
                        isEnd && "rounded-r-full"
                      )}
                    >
                      <button
                        type="button"
                        role="gridcell"
                        data-date={iso}
                        disabled={isPast}
                        tabIndex={iso === (value.start ?? todayIso) ? 0 : -1}
                        aria-current={iso === todayIso ? "date" : undefined}
                        aria-selected={isEndpoint || isInside}
                        aria-label={formatLong(iso)}
                        onMouseEnter={() => setHovered(iso)}
                        onFocus={() => setHovered(iso)}
                        onClick={() => handleDayClick(iso)}
                        className={cn(
                          "relative flex h-11 w-full items-center justify-center rounded-full font-utility text-sm transition-colors md:h-10",
                          isPast && "cursor-not-allowed text-charcoal/20",
                          !isPast && !isEndpoint && "text-charcoal hover:bg-forest/20",
                          isInside && "text-forest-dark",
                          isEndpoint && "bg-forest text-warm-white hover:bg-forest",
                          iso === todayIso && !isEndpoint && "font-semibold text-forest"
                        )}
                      >
                        {day.getDate()}
                        {iso === todayIso && !isEndpoint && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-1 h-1 w-1 rounded-full bg-forest"
                          />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-stone-dark pt-4">
        <div className="flex items-stretch gap-2 sm:gap-3">
          <Field
            label={labels.start}
            value={value.start ? formatShort(value.start) : "—"}
            filled={Boolean(value.start)}
          />
          <span aria-hidden="true" className="self-center text-charcoal/30">
            →
          </span>
          <Field
            label={labels.end}
            value={value.end ? formatShort(value.end) : "—"}
            filled={Boolean(value.end)}
          />
        </div>

        <div className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="font-utility text-xs text-charcoal/60" aria-live="polite">
            {nights > 0 ? labels.selectedRange : labels.hint}
          </p>
          {value.start && (
            <button
              type="button"
              onClick={() => onChange({ start: null, end: null })}
              className="shrink-0 font-utility text-xs uppercase tracking-wide text-forest underline underline-offset-4 hover:text-forest-dark"
            >
              {labels.clear}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function monthLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

function MonthName({ date, locale }: { date: Date; locale: string }) {
  return <>{monthLabel(date, locale)}</>;
}

function NavButton({
  label,
  onClick,
  disabled,
  direction,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  direction: "prev" | "next";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-dark text-charcoal transition-colors hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-stone-dark disabled:hover:text-charcoal"
    >
      <svg
        viewBox="0 0 12 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className={cn("h-3.5 w-3.5", direction === "prev" ? "rotate-90" : "-rotate-90")}
        aria-hidden="true"
      >
        <path d="M1 1.5 6 6.5l5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Field({ label, value, filled }: { label: string; value: string; filled: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-xl border px-3 py-2 transition-colors",
        filled ? "border-forest/30 bg-forest/5" : "border-stone-dark bg-stone/40"
      )}
    >
      <p className="font-utility text-[10px] uppercase tracking-wide text-charcoal/50">{label}</p>
      <p className={cn("mt-0.5 truncate text-sm", filled ? "text-charcoal" : "text-charcoal/40")}>
        {value}
      </p>
    </div>
  );
}
