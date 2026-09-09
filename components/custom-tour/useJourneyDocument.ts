"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ITINERARY_CATEGORY_IDS } from "@/lib/itineraries/categories";
import { buildJourneyDocument } from "@/lib/journey-document/fromWizard";
import { downloadJourneyDocument, type JourneyDocument } from "@/lib/journey-document";
import type { JourneyPlan } from "@/lib/journey/plan";
import type { WizardState } from "./WizardShell";

const ACCOMMODATION_KEYS = [
  "budget",
  "comfortable",
  "boutique",
  "luxury",
  "ecoLodge",
  "recommend",
] as const;

/**
 * The journey as a document, plus the one function that saves it.
 *
 * Both the plan step and the review step offer a download, and the Word copy
 * that rides along with the WhatsApp hand-off has to be the same file — so all
 * three go through here rather than each assembling their own.
 */
export function useJourneyDocument({
  state,
  locale,
  plan,
  whatsappNumber,
}: {
  state: WizardState;
  locale: string;
  plan: JourneyPlan;
  whatsappNumber: string;
}) {
  const t = useTranslations("customTour");
  const [pending, setPending] = useState<"pdf" | "doc" | null>(null);
  const [failed, setFailed] = useState(false);

  const interestLabels = state.interests
    .filter((key) => (ITINERARY_CATEGORY_IDS as readonly string[]).includes(key))
    .map((key) => t(`interests.${key}`));

  const accommodationLabels = state.accommodation
    .filter((key): key is (typeof ACCOMMODATION_KEYS)[number] =>
      (ACCOMMODATION_KEYS as readonly string[]).includes(key)
    )
    .map((key) => t(`accommodation.${key}`));

  const datesValue =
    state.dateRange.start && state.dateRange.end
      ? `${formatDate(state.dateRange.start, locale)} – ${formatDate(state.dateRange.end, locale)}`
      : "-";

  const chosenIdeas = plan.stops.map(
    (stop) => `${stop.experience.title} — ${stop.experience.location}`
  );

  const document: JourneyDocument = useMemo(
    () =>
      buildJourneyDocument({
        labels: {
          title: t("document.title"),
          tagline: t("document.tagline"),
          preparedFor: t("document.preparedFor"),
          preparedOn: t("document.preparedOn"),
          summaryTitle: t("document.summaryTitle"),
          itinerariesTitle: t("document.itinerariesTitle"),
          routeTitle: t("document.routeTitle"),
          mapTitle: t("document.mapTitle"),
          contactTitle: t("document.contactTitle"),
          noticeTitle: t("document.noticeTitle"),
          notice: t("document.notice"),
          whatsappLabel: t("document.whatsappLabel"),
          highlightsTitle: t("suggestionsHighlights"),
          bestTimeLabel: t("suggestionsBestTime"),
          durationLabel: t("suggestionsDuration"),
          footer: t("document.footer"),
          fileName: t("document.fileName"),
        },
        plan,
        preparedFor: state.name.trim(),
        preparedOn: formatDate(new Date().toISOString().slice(0, 10), locale),
        summaryRows: [
          { label: t("travelersLabel"), value: String(state.travelers) },
          { label: t("datesLabel"), value: datesValue },
          { label: t("interestsLabel"), value: interestLabels.join(", ") },
          { label: t("accommodationLabel"), value: accommodationLabels.join(", ") },
          ...(state.accommodationNotes.trim()
            ? [{ label: t("accommodationNotesLabel"), value: state.accommodationNotes.trim() }]
            : []),
        ],
        contactRows: [
          { label: t("contactName"), value: state.name },
          { label: t("contactEmail"), value: state.email },
          { label: t("contactPhone"), value: state.phone },
          ...(state.country.trim() ? [{ label: t("contactCountry"), value: state.country }] : []),
          ...(state.requirements.trim()
            ? [{ label: t("requirementsLabel"), value: state.requirements }]
            : []),
        ],
        whatsappNumber,
        formatDayLabel: (from, to) =>
          from === to
            ? t("journeyPlan.dayLabel", { day: from })
            : t("journeyPlan.dayRangeLabel", { from, to }),
        formatDriveLabel: (km, duration) => t("journeyPlan.driveLabel", { km, duration }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, locale, plan, whatsappNumber, t]
  );

  const download = useCallback(
    async (kind: "pdf" | "doc") => {
      setPending(kind);
      setFailed(false);
      try {
        await downloadJourneyDocument(document, kind);
      } catch {
        setFailed(true);
      } finally {
        setPending(null);
      }
    },
    [document]
  );

  return {
    document,
    download,
    pending,
    failed,
    interestLabels,
    accommodationLabels,
    datesValue,
    chosenIdeas,
  };
}

export function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}
