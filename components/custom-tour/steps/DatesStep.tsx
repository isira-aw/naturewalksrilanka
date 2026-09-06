"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { countDays, isValidRange, toISODate, type DateRangeValue } from "@/lib/tour/dateRange";

/**
 * Travel dates are collected, not checked: every journey is staffed from Nature
 * Walks Sri Lanka's own team of certified guides, so any date can be arranged
 * and there is no calendar to consult before answering.
 */
export function DatesStep({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const t = useTranslations("customTour");
  const startId = useId();
  const endId = useId();
  const today = toISODate(new Date());

  const days = countDays(value);
  const rangeInvalid = Boolean(value.start && value.end && !isValidRange(value));

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">{t("datesLabel")}</h2>
      <p className="mt-2 text-sm text-charcoal/60">{t("datesHelp")}</p>

      <div className="mt-6 grid max-w-md gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={startId}
            className="block font-utility text-xs uppercase tracking-wide text-charcoal/50"
          >
            {t("datesStart")}
          </label>
          <input
            id={startId}
            type="date"
            min={today}
            value={value.start ?? ""}
            onChange={(event) => onChange({ ...value, start: event.target.value || null })}
            className="mt-2 w-full rounded-lg border border-charcoal/20 bg-warm-white px-4 py-3 text-charcoal focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
          />
        </div>
        <div>
          <label
            htmlFor={endId}
            className="block font-utility text-xs uppercase tracking-wide text-charcoal/50"
          >
            {t("datesEnd")}
          </label>
          <input
            id={endId}
            type="date"
            min={value.start ?? today}
            value={value.end ?? ""}
            onChange={(event) => onChange({ ...value, end: event.target.value || null })}
            className="mt-2 w-full rounded-lg border border-charcoal/20 bg-warm-white px-4 py-3 text-charcoal focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
          />
        </div>
      </div>

      <p role="status" className="mt-4 text-sm text-charcoal/70">
        {rangeInvalid
          ? t("datesInvalid")
          : days > 0
            ? t("datesSelected", { count: days })
            : ""}
      </p>
    </div>
  );
}
