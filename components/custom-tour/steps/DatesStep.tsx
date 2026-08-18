"use client";

import { useTranslations } from "next-intl";
import { AvailabilityCalendar, type DateRangeValue } from "@/components/calendar/AvailabilityCalendar";

export function DatesStep({
  locale,
  value,
  onChange,
}: {
  locale: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const t = useTranslations("customTour");
  const calendarLabels = useTranslations("calendar");

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">{t("datesLabel")}</h2>
      <p className="mt-2 text-sm text-charcoal/60">{t("datesHelp")}</p>
      <div className="mt-6 max-w-md">
        <AvailabilityCalendar
          locale={locale}
          value={value}
          onChange={onChange}
          labels={{
            available: calendarLabels("available"),
            unavailable: calendarLabels("unavailable"),
            selected: calendarLabels("selected"),
            today: calendarLabels("today"),
            daysSelected: calendarLabels.raw("daysSelected"),
            rangeUnavailable: calendarLabels("rangeUnavailable"),
            rangeAvailable: calendarLabels("rangeAvailable"),
            loading: calendarLabels("loading"),
            error: calendarLabels("error"),
            invalidRange: calendarLabels("invalidRange"),
          }}
        />
      </div>
    </div>
  );
}
