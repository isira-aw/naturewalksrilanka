"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { SuggestionsPanel } from "@/components/custom-tour/SuggestionsPanel";
import type { Experience } from "@/lib/content/schema";
import { StepHeading } from "./StepHeading";

const INTEREST_KEYS = [
  "wildlife",
  "trekking",
  "culture",
  "birding",
  "beach",
  "photography",
  "adventure",
] as const;

/**
 * Categories on the left, the prebuilt ideas that match them on the right.
 * Each idea belongs to exactly one category, so ticking two categories shows
 * both sets rather than blending them into one "wildlife + photography" pitch.
 */
export function InterestsStep({
  value,
  onToggle,
  experiences,
}: {
  value: string[];
  onToggle: (value: string) => void;
  experiences: Experience[];
}) {
  const t = useTranslations("customTour");
  const matching = experiences.filter((experience) => value.includes(experience.category));

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
      <fieldset className="min-w-0">
        <StepHeading title={t("interestsLabel")} hint={t("interestsHint")} />

        <div className="mt-6 flex flex-wrap gap-2.5">
          {INTEREST_KEYS.map((key) => {
            const checked = value.includes(key);
            const inputId = `interest-${key}`;
            return (
              <div key={key}>
                <input
                  type="checkbox"
                  id={inputId}
                  checked={checked}
                  onChange={() => onToggle(key)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest",
                    checked
                      ? "border-forest bg-forest text-warm-white"
                      : "border-stone-dark bg-warm-white text-charcoal hover:border-forest hover:text-forest"
                  )}
                >
                  {checked && (
                    <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-2.5 w-2.5" aria-hidden="true">
                      <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {t(`interests.${key}`)}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 lg:mt-0">
        <SuggestionsPanel
          experiences={matching}
          labels={{
            title: t("suggestionsTitle"),
            empty: t("suggestionsEmpty"),
            count: t("suggestionsCount", { count: matching.length }),
            readMore: t("suggestionsReadMore"),
            close: t("suggestionsClose"),
            location: t("suggestionsLocation"),
            bestTime: t("suggestionsBestTime"),
            duration: t("suggestionsDuration"),
            highlights: t("suggestionsHighlights"),
          }}
        />
      </div>
    </div>
  );
}
