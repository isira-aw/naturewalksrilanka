"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import {
  BinocularsIcon,
  CameraIcon,
  PawIcon,
  SummitIcon,
  TempleIcon,
  TrailIcon,
  WaveIcon,
} from "@/components/ui/icons";
import { StepHeading } from "./StepHeading";

const INTERESTS = [
  { key: "wildlife", Icon: PawIcon },
  { key: "trekking", Icon: TrailIcon },
  { key: "culture", Icon: TempleIcon },
  { key: "birding", Icon: BinocularsIcon },
  { key: "beach", Icon: WaveIcon },
  { key: "photography", Icon: CameraIcon },
  { key: "adventure", Icon: SummitIcon },
] as const;

/**
 * Icon tiles rather than a row of text pills: they scan faster in five
 * languages, and each one is a comfortably thumb-sized target on a phone.
 */
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
      <StepHeading
        as="legend"
        icon={BinocularsIcon}
        title={t("interestsLabel")}
        hint={t("interestsHint")}
      />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {INTERESTS.map(({ key, Icon }) => {
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
                  "flex h-full min-h-28 cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-4 transition-all duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest",
                  checked
                    ? "border-forest bg-forest text-warm-white shadow-[0_8px_24px_rgba(2,78,42,0.18)]"
                    : "border-stone-dark bg-warm-white text-charcoal hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-[0_8px_24px_rgba(28,30,27,0.06)]"
                )}
              >
                <span className="flex items-start justify-between">
                  <Icon className={cn("h-7 w-7", checked ? "text-warm-white" : "text-forest")} />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                      checked ? "border-warm-white bg-warm-white/20" : "border-charcoal/20"
                    )}
                  >
                    {checked && (
                      <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-2.5 w-2.5">
                        <path d="M1 5.2 4.3 8.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="text-sm leading-snug font-medium">{t(`interests.${key}`)}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
