"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { DateRangeValue } from "@/components/calendar/AvailabilityCalendar";
import type { ItineraryPlan } from "@/lib/ai/itinerarySchema";

const SriLankaMap = dynamic(
  () => import("./ai-assistant/SriLankaMap").then((m) => m.SriLankaMap),
  { ssr: false }
);

import { DayCard } from "./ai-assistant/DayCard";

export type AiAssistantStatus = "idle" | "loading" | "ready" | "error" | "rate_limited";

export function AIAssistantStep({
  travelers,
  dateRange,
  interests,
  accommodation,
  accommodationNotes,
  itinerary,
  selections,
  status,
  onStatusChange,
  onItinerary,
  onSelectDay,
}: {
  travelers: number;
  dateRange: DateRangeValue;
  interests: string[];
  accommodation: string[];
  accommodationNotes: string;
  itinerary: ItineraryPlan | null;
  selections: string[];
  status: AiAssistantStatus;
  onStatusChange: (status: AiAssistantStatus) => void;
  onItinerary: (itinerary: ItineraryPlan | null) => void;
  onSelectDay: (dayIndex: number, slug: string) => void;
}) {
  const t = useTranslations("customTour.aiAssistant");
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const selectedRoute = useMemo(() => {
    if (!itinerary) return [];
    return selections
      .map((slug, index) => itinerary.days[index]?.options.find((opt) => opt.slug === slug))
      .filter((opt): opt is NonNullable<typeof opt> => Boolean(opt));
  }, [itinerary, selections]);

  const currentDayIndex = selections.length;
  const currentDay = itinerary?.days[currentDayIndex];
  const isComplete = Boolean(itinerary) && currentDayIndex >= (itinerary?.days.length ?? 0);

  // The model itself marks one option per day as `recommended`, weighing season/
  // safety and route efficiency alongside interests — falls back to the first
  // option only if the model response is missing the flag entirely.
  const recommendedOption = useMemo(() => {
    if (!currentDay || currentDay.options.length === 0) return null;
    return currentDay.options.find((opt) => opt.recommended) ?? currentDay.options[0];
  }, [currentDay]);

  const otherOptions = useMemo(() => {
    if (!currentDay || !recommendedOption) return currentDay?.options ?? [];
    return currentDay.options.filter((opt) => opt !== recommendedOption);
  }, [currentDay, recommendedOption]);

  async function handleGenerate() {
    if (!dateRange.start || !dateRange.end) return;
    onStatusChange("loading");

    try {
      const response = await fetch("/api/ai-assistant/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          travelers,
          startDate: dateRange.start,
          endDate: dateRange.end,
          interests,
          accommodation,
          accommodationNotes,
        }),
      });

      if (response.status === 429) {
        onStatusChange("rate_limited");
        return;
      }
      if (!response.ok) {
        onStatusChange("error");
        return;
      }

      const data = await response.json();
      onItinerary(data.itinerary as ItineraryPlan);
      onStatusChange("ready");
    } catch {
      onStatusChange("error");
    }
  }

  function handleRegenerate() {
    onItinerary(null);
    onStatusChange("idle");
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">{t("title")}</h2>
      <p className="mt-3 max-w-2xl text-sm text-charcoal/70">{t("intro")}</p>

      {(status === "idle" || status === "error" || status === "rate_limited") && (
        <div className="mt-6">
          {status === "error" && (
            <p role="alert" className="mb-4 text-sm text-clay">
              {t("error")}
            </p>
          )}
          {status === "rate_limited" && (
            <p role="alert" className="mb-4 text-sm text-clay">
              {t("rateLimited")}
            </p>
          )}
          {status !== "rate_limited" && (
            <Button type="button" variant="primary" onClick={handleGenerate}>
              {t("generateCta")}
            </Button>
          )}
        </div>
      )}

      {status === "loading" && (
        <p className="mt-6 text-sm text-charcoal/70">{t("loading")}</p>
      )}

      {status === "ready" && itinerary && (
        <div className="mt-6 space-y-6">
          <SriLankaMap
            candidates={currentDay?.options ?? []}
            selectedRoute={selectedRoute}
            hoveredSlug={hoveredSlug}
          />

          {!isComplete && currentDay && (
            <div>
              <h3 className="font-utility text-xs uppercase tracking-wide text-charcoal/60">
                {t("dayLabel", { day: currentDay.day })}
              </h3>

              {recommendedOption && (
                <div className="mt-3">
                  <span className="font-utility text-xs uppercase tracking-wide text-forest">
                    {t("recommendedLabel")}
                  </span>
                  <div className="mt-2">
                    <DayCard
                      option={recommendedOption}
                      selected={selections[currentDayIndex] === recommendedOption.slug}
                      recommended
                      onSelect={() => onSelectDay(currentDayIndex, recommendedOption.slug)}
                      onHoverChange={(hovered) =>
                        setHoveredSlug(hovered ? recommendedOption.slug : null)
                      }
                    />
                  </div>
                </div>
              )}

              {otherOptions.length > 0 && (
                <div className="mt-4">
                  <span className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                    {t("otherOptionsLabel")}
                  </span>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {otherOptions.map((option, index) => (
                      <DayCard
                        key={`${index}-${option.slug}`}
                        option={option}
                        selected={selections[currentDayIndex] === option.slug}
                        onSelect={() => onSelectDay(currentDayIndex, option.slug)}
                        onHoverChange={(hovered) => setHoveredSlug(hovered ? option.slug : null)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isComplete && (
            <div>
              <h3 className="font-utility text-xs uppercase tracking-wide text-charcoal/60">
                {t("selectedSummaryTitle")}
              </h3>
              <ol className="mt-3 space-y-2">
                {selectedRoute.map((option, index) => (
                  <li key={`${index}-${option.slug}`} className="text-sm text-charcoal">
                    <span className="text-charcoal/50">{t("dayLabel", { day: index + 1 })}:</span>{" "}
                    {option.name}
                  </li>
                ))}
              </ol>
              <Button type="button" variant="secondary" className="mt-4" onClick={handleRegenerate}>
                {t("regenerate")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
