"use client";

import { useTranslations } from "next-intl";
import { DateRangeCalendar } from "@/components/custom-tour/DateRangeCalendar";
import { countDays, type DateRangeValue } from "@/lib/tour/dateRange";
import { StepHeading } from "./StepHeading";

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
      <StepHeading title={t("datesLabel")} hint={t("datesHelp")} />

      <div className="mt-8">
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
