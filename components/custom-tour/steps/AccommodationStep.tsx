"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { LodgeIcon } from "@/components/ui/icons";
import { StepHeading } from "./StepHeading";

const ACCOMMODATION_KEYS = [
  "budget",
  "comfortable",
  "boutique",
  "luxury",
  "ecoLodge",
  "recommend",
] as const;

export function AccommodationStep({
  value,
  onToggle,
  notes,
  onNotesChange,
}: {
  value: string[];
  onToggle: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}) {
  const t = useTranslations("customTour");

  return (
    <div>
      <fieldset>
        <StepHeading
          as="legend"
          icon={LodgeIcon}
          title={t("accommodationLabel")}
          hint={t("accommodationHint")}
        />

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {ACCOMMODATION_KEYS.map((key) => {
            const checked = value.includes(key);
            const inputId = `accommodation-${key}`;
            return (
              <label
                key={key}
                htmlFor={inputId}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200",
                  checked
                    ? "border-forest bg-forest/8 text-forest"
                    : "border-stone-dark bg-warm-white text-charcoal hover:border-forest/40"
                )}
              >
                <input
                  type="checkbox"
                  id={inputId}
                  checked={checked}
                  onChange={() => onToggle(key)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    checked ? "border-forest bg-forest text-warm-white" : "border-charcoal/25"
                  )}
                >
                  {checked && (
                    <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-2.5 w-2.5">
                      <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm">{t(`accommodation.${key}`)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8">
        <label
          htmlFor="accommodation-notes"
          className="block font-utility text-xs uppercase tracking-wide text-charcoal/55"
        >
          {t("accommodationNotesLabel")}
          <span className="ml-2 normal-case tracking-normal text-charcoal/40">
            {t("optional")}
          </span>
        </label>
        <textarea
          id="accommodation-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-stone-dark bg-warm-white p-4 text-sm text-charcoal transition-colors focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        />
      </div>
    </div>
  );
}
