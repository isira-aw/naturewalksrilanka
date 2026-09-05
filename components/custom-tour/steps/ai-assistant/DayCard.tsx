"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { ItineraryOption } from "@/lib/ai/itinerarySchema";

function formatDuration(minutes: number) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function DayCard({
  option,
  selected,
  recommended = false,
  onSelect,
  onHoverChange,
}: {
  option: ItineraryOption;
  selected: boolean;
  recommended?: boolean;
  onSelect: () => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const t = useTranslations("customTour.aiAssistant");

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border px-4 py-4 text-left text-sm transition-colors",
        selected
          ? "border-forest bg-forest/5"
          : recommended
            ? "border-forest/60 bg-forest/[0.03] hover:border-forest"
            : "border-charcoal/20 hover:border-forest/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("font-display text-lg", selected ? "text-forest" : "text-charcoal")}>
          {option.name}
        </span>
        {recommended && (
          <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 font-utility text-[10px] uppercase tracking-wide text-white">
            {t("recommendedBadge")}
          </span>
        )}
      </div>
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
        <span className="flex items-center gap-1.5 font-utility text-xs text-charcoal/50">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-3.5 w-3.5 shrink-0"
          >
            <path
              d="M2.5 15.5 7 5.5a1 1 0 0 1 1.82 0L13 15.5M4.5 12.5h7M15 6.5a2 2 0 1 1 3 1.73V16a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V8.23A2 2 0 0 1 15 6.5Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("distanceLabel", {
            km: Math.round(option.distanceKmFromPrevious),
            duration: formatDuration(option.travelMinutesFromPrevious),
          })}
        </span>
      )}
      <span className="text-xs italic text-charcoal/60">{option.suitability}</span>
    </button>
  );
}
