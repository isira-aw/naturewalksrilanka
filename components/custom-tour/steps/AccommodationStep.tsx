"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

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
        <legend className="font-display text-2xl text-charcoal">{t("accommodationLabel")}</legend>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ACCOMMODATION_KEYS.map((key) => {
            const checked = value.includes(key);
            const inputId = `accommodation-${key}`;
            return (
              <label
                key={key}
                htmlFor={inputId}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                  checked
                    ? "border-forest bg-forest/5 text-forest"
                    : "border-charcoal/20 text-charcoal hover:border-forest/50"
                )}
              >
                <input
                  type="checkbox"
                  id={inputId}
                  checked={checked}
                  onChange={() => onToggle(key)}
                  className="h-4 w-4 accent-forest"
                />
                {t(`accommodation.${key}`)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8">
        <label htmlFor="accommodation-notes" className="block font-utility text-xs uppercase tracking-wide text-charcoal/60">
          {t("accommodationNotesLabel")}
        </label>
        <textarea
          id="accommodation-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-charcoal/20 bg-warm-white p-4 text-sm text-charcoal focus:border-forest focus:outline-none"
        />
      </div>
    </div>
  );
}
