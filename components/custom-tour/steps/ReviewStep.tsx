"use client";

import { useTranslations } from "next-intl";
import { buildCustomTourMessage, buildWhatsAppUrl } from "@/lib/whatsapp/buildMessage";
import type { WizardState } from "../WizardShell";
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

const ACCOMMODATION_KEYS = [
  "budget",
  "comfortable",
  "boutique",
  "luxury",
  "ecoLodge",
  "recommend",
] as const;

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function ReviewStep({
  state,
  locale,
  whatsappNumber,
}: {
  state: WizardState;
  locale: string;
  whatsappNumber: string;
}) {
  const t = useTranslations("customTour");

  const interestLabels = state.interests
    .filter((key): key is (typeof INTEREST_KEYS)[number] => (INTEREST_KEYS as readonly string[]).includes(key))
    .map((key) => t(`interests.${key}`));

  const accommodationLabels = state.accommodation
    .filter((key): key is (typeof ACCOMMODATION_KEYS)[number] =>
      (ACCOMMODATION_KEYS as readonly string[]).includes(key)
    )
    .map((key) => t(`accommodation.${key}`));

  const aiRouteNames = state.aiSelections
    .map((slug, index) => state.aiItinerary?.days[index]?.options.find((opt) => opt.slug === slug)?.name)
    .filter((name): name is string => Boolean(name));

  const message = buildCustomTourMessage(
    {
      travelers: state.travelers,
      startDate: state.dateRange.start,
      endDate: state.dateRange.end,
      interests: interestLabels,
      accommodation: accommodationLabels,
      accommodationNotes: state.accommodationNotes,
      aiRoute: aiRouteNames,
      name: state.name,
      email: state.email,
      phone: state.phone,
      country: state.country,
      requirements: state.requirements,
    },
    locale
  );

  const href = buildWhatsAppUrl(whatsappNumber, message);

  return (
    <div>
      <StepHeading title={t("reviewTitle")} hint={t("reviewHint")} />

      <dl className="mt-8 divide-y divide-stone-dark overflow-hidden rounded-2xl border border-stone-dark bg-warm-white">
        <ReviewRow label={t("travelersLabel")} value={String(state.travelers)} />
        <ReviewRow
          label={t("datesLabel")}
          value={
            state.dateRange.start && state.dateRange.end
              ? `${formatDate(state.dateRange.start, locale)} – ${formatDate(state.dateRange.end, locale)}`
              : "-"
          }
        />
        <ReviewRow
          label={t("interestsLabel")}
          value={interestLabels.length ? interestLabels.join(", ") : "-"}
        />
        <ReviewRow
          label={t("accommodationLabel")}
          value={accommodationLabels.length ? accommodationLabels.join(", ") : "-"}
        />
        {state.accommodationNotes.trim() && (
          <ReviewRow label={t("accommodationNotesLabel")} value={state.accommodationNotes} />
        )}
        {aiRouteNames.length > 0 && (
          <ReviewRow
            label={t("aiAssistant.selectedSummaryTitle")}
            value={aiRouteNames.map((name, index) => `${t("aiAssistant.dayLabel", { day: index + 1 })}: ${name}`).join("\n")}
          />
        )}
        <ReviewRow label={t("contactName")} value={state.name || "-"} />
        <ReviewRow label={t("contactEmail")} value={state.email || "-"} />
        <ReviewRow label={t("contactPhone")} value={state.phone || "-"} />
        {state.country.trim() && <ReviewRow label={t("contactCountry")} value={state.country} />}
        {state.requirements.trim() && (
          <ReviewRow label={t("requirementsLabel")} value={state.requirements} />
        )}
      </dl>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-forest px-8 py-4 text-base font-medium tracking-wide text-warm-white transition-colors duration-200 hover:bg-forest-dark sm:w-auto"
      >
        <WhatsAppIcon className="h-4 w-4" />
        {t("submit")}
      </a>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
      <dt className="font-utility text-xs uppercase tracking-wide text-charcoal/50">{label}</dt>
      <dd className="whitespace-pre-line text-sm text-charcoal sm:col-span-2">{value}</dd>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.1c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.98s.74-2.11 1-2.4c.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.29.29-.12.57.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.64-.14.26.09 1.67.79 1.96.93.29.14.48.21.55.33.07.12.07.67-.17 1.35Z" />
    </svg>
  );
}
