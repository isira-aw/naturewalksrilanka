"use client";

import { cn } from "@/lib/utils/cn";

/**
 * Wizard progress in two shapes from one source of truth: a vertical rail
 * beside the form on desktop, and a bar with "step n of m" on mobile, where a
 * seven-item horizontal stepper used to wrap into an unreadable block.
 *
 * Completed steps are links back — people change their minds about dates after
 * seeing the interests list — while steps ahead stay locked until validated.
 */
export function StepProgressRail({
  steps,
  current,
  onGoTo,
}: {
  steps: string[];
  current: number;
  onGoTo: (step: number) => void;
}) {
  return (
    <ol className="space-y-1">
      {steps.map((label, index) => {
        const step = index + 1;
        const isCurrent = step === current;
        const isComplete = step < current;
        return (
          <li key={label}>
            <button
              type="button"
              disabled={!isComplete}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onGoTo(step)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                isComplete && "hover:bg-forest/8",
                isCurrent && "bg-forest/10",
                !isComplete && !isCurrent && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-utility text-[11px] transition-colors",
                  isCurrent && "bg-forest text-warm-white",
                  isComplete && "bg-forest/15 text-forest",
                  !isCurrent && !isComplete && "border border-charcoal/20 text-charcoal/40"
                )}
              >
                {isComplete ? <CheckIcon className="h-3 w-3" /> : String(step).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "font-utility text-xs uppercase tracking-wide",
                  isCurrent && "text-forest",
                  isComplete && "text-charcoal/70",
                  !isCurrent && !isComplete && "text-charcoal/40"
                )}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function StepProgressBar({
  steps,
  current,
  stepOfLabel,
}: {
  steps: string[];
  current: number;
  stepOfLabel: string;
}) {
  const percent = (current / steps.length) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-utility text-xs uppercase tracking-wide text-forest">
          {steps[current - 1]}
        </p>
        <p className="font-utility text-[11px] uppercase tracking-wide text-charcoal/45">
          {stepOfLabel}
        </p>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-stone-dark">
        <div
          className="h-full rounded-full bg-forest transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
