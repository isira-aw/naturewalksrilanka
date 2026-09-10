"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/**
 * Offers back a trip that was left half-planned on this device.
 *
 * The draft is never restored silently. Someone returning a fortnight later
 * to start a different holiday would find the form mysteriously pre-filled
 * with a stranger's answers — their own, but forgotten — and wonder what the
 * site knows about them. Asking costs one click and removes the surprise.
 */
export function ResumeDraftBanner({
  onResume,
  onDiscard,
}: {
  onResume: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("customTour");

  return (
    <div
      role="status"
      className="mb-6 rounded-2xl border border-stone-dark bg-stone/20 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal">{t("resumeTitle")}</p>
        <p className="mt-1 text-sm leading-relaxed text-charcoal/70">{t("resumeBody")}</p>
      </div>
      <div className="mt-4 flex flex-shrink-0 items-center gap-3 sm:mt-0">
        <Button type="button" variant="primary" onClick={onResume}>
          {t("resumeContinue")}
        </Button>
        <Button type="button" variant="secondary" onClick={onDiscard}>
          {t("resumeDiscard")}
        </Button>
      </div>
    </div>
  );
}
