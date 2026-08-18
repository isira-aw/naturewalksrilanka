"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  addMonths,
  buildMonthGrid,
  isWithinRange,
  toISODate,
} from "@/lib/calendar/dateUtils";

type DayStatus = "available" | "unavailable" | "unknown";

export type DateRangeValue = { start: string | null; end: string | null };

type Labels = {
  available: string;
  unavailable: string;
  selected: string;
  today: string;
  daysSelected: string;
  rangeUnavailable: string;
  rangeAvailable: string;
  loading: string;
  error: string;
  invalidRange: string;
};

export function AvailabilityCalendar({
  locale,
  value,
  onChange,
  labels,
}: {
  locale: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  labels: Labels;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [dayStatus, setDayStatus] = useState<Map<string, DayStatus>>(new Map());
  const [loading, setLoading] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;
    const grid = buildMonthGrid(visibleMonth);
    const monthStart = toISODate(grid[0]);
    const monthEnd = toISODate(grid[grid.length - 1]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a loading indicator for the fetch this effect starts is the point of the effect
    setLoading(true);
    fetch("/api/calendar/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: monthStart, endDate: monthEnd }),
    })
      .then((res) => res.json())
      .then((data: { status: DayStatus; unavailableRanges?: { start: string; end: string }[] }) => {
        if (cancelled) return;
        setApiUnavailable(data.status === "unknown");
        setDayStatus((prev) => {
          const next = new Map(prev);
          for (const day of grid) {
            const iso = toISODate(day);
            if (data.status === "unknown") {
              next.set(iso, "unknown");
            } else if (data.status === "available") {
              next.set(iso, "available");
            } else {
              const isBusy = (data.unavailableRanges ?? []).some((r) =>
                isWithinRange(day, r.start, r.end)
              );
              next.set(iso, isBusy ? "unavailable" : "available");
            }
          }
          return next;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setApiUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visibleMonth]);

  const grid = buildMonthGrid(visibleMonth);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    visibleMonth
  );
  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    });
  }, [locale]);

  function handleDayClick(day: Date) {
    const iso = toISODate(day);
    if (day.getMonth() !== visibleMonth.getMonth()) return;

    if (!value.start || (value.start && value.end)) {
      onChange({ start: iso, end: null });
      return;
    }

    if (iso <= value.start) {
      onChange({ start: iso, end: null });
      return;
    }

    onChange({ start: value.start, end: iso });
  }

  const rangeHasUnavailable =
    value.start &&
    value.end &&
    Array.from(dayStatus.entries()).some(
      ([iso, status]) => iso >= value.start! && iso <= value.end! && status === "unavailable"
    );

  const daysSelectedCount =
    value.start && value.end
      ? Math.round((new Date(value.end).getTime() - new Date(value.start).getTime()) / 86400000) + 1
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
          className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/20 text-charcoal hover:border-forest hover:text-forest"
        >
          ‹
        </button>
        <p className="font-display text-base text-charcoal sm:text-lg">{monthLabel}</p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          className="-mr-2.5 flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/20 text-charcoal hover:border-forest hover:text-forest"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center font-utility text-[11px] uppercase text-charcoal/50">
        {weekdayLabels.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div role="grid" aria-label={monthLabel} className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === visibleMonth.getMonth();
          const status = dayStatus.get(iso) ?? "unknown";
          const isToday = toISODate(today) === iso;
          const isSelected =
            (value.start && iso === value.start) ||
            (value.end && iso === value.end) ||
            (value.start && value.end && iso > value.start && iso < value.end);
          const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              disabled={!inMonth || isPast}
              aria-current={isToday ? "date" : undefined}
              aria-selected={Boolean(isSelected)}
              aria-label={`${iso} — ${
                status === "available" ? labels.available : status === "unavailable" ? labels.unavailable : ""
              }${isSelected ? ` (${labels.selected})` : ""}`}
              onClick={() => handleDayClick(day)}
              className={cn(
                "relative aspect-square rounded-full font-utility text-sm transition-colors",
                !inMonth && "invisible",
                isPast && "text-charcoal/20",
                !isPast && inMonth && status === "unavailable" && "text-charcoal/30 line-through decoration-clay",
                !isPast && inMonth && status === "available" && "text-charcoal hover:bg-stone",
                !isPast && inMonth && status === "unknown" && "text-charcoal/60",
                isSelected && "bg-forest text-warm-white hover:bg-forest",
                isToday && !isSelected && "border border-forest"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 font-utility text-xs uppercase text-charcoal/60">
        <Legend swatchClassName="bg-stone" label={labels.available} />
        <Legend swatchClassName="bg-charcoal/10" label={labels.unavailable} strike />
        <Legend swatchClassName="bg-forest" label={labels.selected} />
      </div>

      <div className="mt-4 min-h-6" aria-live="polite">
        {loading && <p className="text-sm text-charcoal/50">{labels.loading}</p>}
        {!loading && apiUnavailable && <p className="text-sm text-clay">{labels.error}</p>}
        {!loading && !apiUnavailable && rangeHasUnavailable && (
          <p className="text-sm text-clay">{labels.rangeUnavailable}</p>
        )}
        {!loading && !apiUnavailable && !rangeHasUnavailable && value.start && value.end && (
          <p className="text-sm text-forest">
            {labels.rangeAvailable} · {labels.daysSelected.replace("{count}", String(daysSelectedCount))}
          </p>
        )}
      </div>
    </div>
  );
}

function Legend({
  swatchClassName,
  label,
  strike,
}: {
  swatchClassName: string;
  label: string;
  strike?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn("h-3 w-3 rounded-full", swatchClassName, strike && "border border-clay")}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
