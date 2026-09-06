"use client";

import { useTranslations } from "next-intl";
import { DateRangeCalendar } from "@/components/custom-tour/DateRangeCalendar";
import { countDays, type DateRangeValue } from "@/lib/tour/dateRange";

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
  const days = countDays(value);

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">{t("datesLabel")}</h2>
      <p className="mt-2 text-sm text-charcoal/60">{t("datesHelp")}</p>

      <div className="mt-6">
        <DateRangeCalendar
          locale={locale}
          value={value}
          onChange={onChange}
          labels={{
            start: t("datesStart"),
            end: t("datesEnd"),
            hint: t("datesHint"),
            previousMonth: t("datesPreviousMonth"),
            nextMonth: t("datesNextMonth"),
            clear: t("datesClear"),
            selectedRange: t("datesSelected", { count: days }),
          }}
        />
      </div>
    </div>
  );
}
