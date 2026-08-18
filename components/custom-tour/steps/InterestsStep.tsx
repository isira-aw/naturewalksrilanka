"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

const INTEREST_KEYS = [
  "wildlife",
  "trekking",
  "culture",
  "birding",
  "beach",
  "photography",
  "adventure",
] as const;

export function InterestsStep({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (value: string) => void;
}) {
  const t = useTranslations("customTour");

  return (
    <fieldset>
      <legend className="font-display text-2xl text-charcoal">{t("interestsLabel")}</legend>
      <div className="mt-6 flex flex-wrap gap-3">
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
                  "block cursor-pointer rounded-full border px-5 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-forest bg-forest text-warm-white"
                    : "border-charcoal/30 text-charcoal hover:border-forest hover:text-forest"
                )}
              >
                {t(`interests.${key}`)}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
