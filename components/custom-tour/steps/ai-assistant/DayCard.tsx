"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { ItineraryOption } from "@/lib/ai/itinerarySchema";

export function DayCard({
  option,
  selected,
  onSelect,
}: {
  option: ItineraryOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("customTour.aiAssistant");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border px-4 py-4 text-left text-sm transition-colors",
        selected
          ? "border-forest bg-forest/5"
          : "border-charcoal/20 hover:border-forest/50"
      )}
    >
      <span className={cn("font-display text-lg", selected ? "text-forest" : "text-charcoal")}>
        {option.name}
      </span>
      <span className="text-charcoal/70">{option.description}</span>
      {option.keywords.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {option.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-charcoal/5 px-2.5 py-1 font-utility text-xs uppercase tracking-wide text-charcoal/60"
            >
              {keyword}
            </span>
          ))}
        </span>
      )}
      {option.distanceKmFromPrevious != null && option.travelMinutesFromPrevious != null && (
        <span className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
          {t("distanceLabel", {
            km: Math.round(option.distanceKmFromPrevious),
            minutes: Math.round(option.travelMinutesFromPrevious),
          })}
        </span>
      )}
      <span className="text-xs italic text-charcoal/60">{option.suitability}</span>
    </button>
  );
}
