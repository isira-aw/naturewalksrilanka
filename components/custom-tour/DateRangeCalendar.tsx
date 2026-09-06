"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  addMonths,
  buildMonthGrid,
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
 * before the arrival starts a fresh range.
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

  const grid = buildMonthGrid(visibleMonth);
  const todayIso = toISODate(today);
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    });
  }, [locale]);

  const previewRange: DateRangeValue =
    value.start && !value.end && hovered && hovered > value.start
      ? { start: value.start, end: hovered }
      : value;

  const atFirstAllowedMonth =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  function handleDayClick(iso: string) {
    if (!value.start || value.end || iso <= value.start) {
      onChange({ start: iso, end: null });
      return;
    }
    onChange({ start: value.start, end: iso });
  }

  function formatLong(iso: string) {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));
  }

  return (
    <div className="max-w-sm rounded-2xl border border-stone-dark bg-warm-white p-5 shadow-[0_1px_2px_rgba(28,30,27,0.04)]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={labels.previousMonth}
          disabled={atFirstAllowedMonth}
          onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-dark text-charcoal transition-colors hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-stone-dark disabled:hover:text-charcoal"
        >
          <Chevron className="h-3.5 w-3.5 rotate-90" />
        </button>
        <p className="font-display text-base text-charcoal sm:text-lg">{monthLabel}</p>
        <button
          type="button"
          aria-label={labels.nextMonth}
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-dark text-charcoal transition-colors hover:border-forest hover:text-forest"
        >
          <Chevron className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 text-center font-utility text-[11px] uppercase tracking-wide text-charcoal/45">
        {weekdayLabels.map((weekday, i) => (
          <div key={i} className="pb-2">
            {weekday}
          </div>
        ))}
      </div>

      <div
        role="grid"
        aria-label={monthLabel}
        onMouseLeave={() => setHovered(null)}
        className="grid grid-cols-7 gap-y-1"
      >
        {grid.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === visibleMonth.getMonth();
          const isPast = iso < todayIso;
          const isStart = iso === previewRange.start;
          const isEnd = iso === previewRange.end;
          const isInside = isBetween(iso, previewRange);
          const isEndpoint = isStart || isEnd;

          if (!inMonth) return <div key={iso} aria-hidden="true" />;

          return (
            <div
              key={iso}
              /* The band is painted on the wrapper so a selected range reads as
                 one continuous ribbon instead of seven separate circles. */
              className={cn(
                "relative first:rounded-l-full last:rounded-r-full",
                (isInside || (isEndpoint && previewRange.end)) && "bg-forest/8",
                isStart && previewRange.end && "rounded-l-full",
                isEnd && "rounded-r-full"
              )}
            >
              <button
                type="button"
                role="gridcell"
                disabled={isPast}
                aria-current={iso === todayIso ? "date" : undefined}
                aria-selected={isEndpoint || isInside}
                aria-label={formatLong(iso)}
                onMouseEnter={() => setHovered(iso)}
                onFocus={() => setHovered(iso)}
                onClick={() => handleDayClick(iso)}
                className={cn(
                  "relative flex aspect-square w-full items-center justify-center rounded-full font-utility text-sm transition-all duration-150",
                  isPast && "cursor-not-allowed text-charcoal/20",
                  !isPast && "text-charcoal hover:bg-forest/10",
                  isInside && "text-forest-dark",
                  isEndpoint && "bg-forest text-warm-white hover:bg-forest",
                  iso === todayIso && !isEndpoint && "font-semibold text-forest"
                )}
              >
                {day.getDate()}
                {iso === todayIso && !isEndpoint && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 h-1 w-1 rounded-full bg-forest"
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-stone-dark pt-4">
        <div className="flex items-stretch gap-3">
          <Field label={labels.start} value={value.start ? formatLong(value.start) : "—"} />
          <span aria-hidden="true" className="self-center text-charcoal/30">
            →
          </span>
          <Field label={labels.end} value={value.end ? formatLong(value.end) : "—"} />
        </div>

        <div className="mt-3 flex min-h-6 items-center justify-between gap-3">
          <p className="font-utility text-xs text-charcoal/55" aria-live="polite">
            {value.start && value.end ? labels.selectedRange : labels.hint}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-lg bg-stone/60 px-3 py-2">
      <p className="font-utility text-[10px] uppercase tracking-wide text-charcoal/50">{label}</p>
      <p className="mt-0.5 truncate text-sm text-charcoal">{value}</p>
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M1 1.5 6 6.5l5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
