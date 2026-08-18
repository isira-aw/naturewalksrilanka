"use client";

import { useTranslations } from "next-intl";

export function TravelersStep({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("customTour");

  return (
    <fieldset>
      <legend className="font-display text-2xl text-charcoal">{t("travelersLabel")}</legend>
      <div className="mt-6 flex items-center gap-6">
        <button
          type="button"
          aria-label="Decrease travelers"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-charcoal/30 text-xl text-charcoal transition-colors hover:border-forest hover:text-forest disabled:opacity-30"
        >
          −
        </button>
        <span
          className="min-w-16 text-center font-utility text-3xl text-charcoal"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="Increase travelers"
          onClick={() => onChange(value + 1)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-charcoal/30 text-xl text-charcoal transition-colors hover:border-forest hover:text-forest"
        >
          +
        </button>
      </div>
    </fieldset>
  );
}
