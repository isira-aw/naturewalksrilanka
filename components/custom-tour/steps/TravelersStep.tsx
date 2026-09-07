"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { MAX_TRAVELERS, MIN_TRAVELERS } from "../WizardShell";
import { StepHeading } from "./StepHeading";

/** Most enquiries are one of these; the counter covers everything in between. */
const QUICK_PICKS = [1, 2, 4, 6];

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
      <StepHeading as="legend" title={t("travelersLabel")} hint={t("travelersHint")} />

      <div className="mt-8 flex w-full max-w-xs items-center justify-between rounded-2xl border border-stone-dark bg-warm-white p-3">
        <CounterButton
          label={t("travelersDecrease")}
          onClick={() => onChange(value - 1)}
          disabled={value <= MIN_TRAVELERS}
        >
          −
        </CounterButton>
        <span className="font-display text-4xl text-charcoal tabular-nums" aria-live="polite">
          {value}
        </span>
        <CounterButton
          label={t("travelersIncrease")}
          onClick={() => onChange(value + 1)}
          disabled={value >= MAX_TRAVELERS}
        >
          +
        </CounterButton>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_PICKS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onChange(count)}
            aria-pressed={value === count}
            className={cn(
              "min-h-11 rounded-full border px-5 font-utility text-sm transition-colors",
              value === count
                ? "border-forest bg-forest text-warm-white"
                : "border-stone-dark text-charcoal/70 hover:border-forest hover:text-forest"
            )}
          >
            {count}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function CounterButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-14 items-center justify-center rounded-xl bg-stone/70 text-2xl text-charcoal transition-colors hover:bg-forest hover:text-warm-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-stone/70 disabled:hover:text-charcoal"
    >
      {children}
    </button>
  );
}
