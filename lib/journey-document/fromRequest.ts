import { createTranslator } from "next-intl";
import {
  ITINERARY_CATEGORY_IDS,
  type ItineraryCategory,
} from "@/lib/itineraries/categories";
import { recordToExperience } from "@/lib/itineraries/toExperience";
import type { ItineraryRecord } from "@/lib/itineraries/types";
import { buildJourneyPlan } from "@/lib/journey/plan";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import { documentSnapshotSchema, type TourRequest } from "@/lib/tourRequests/types";
import { buildJourneyDocument } from "./fromWizard";
import type { JourneyDocument } from "./model";

/**
 * The journey document for an enquiry that was sent some time ago.
 *
 * This is what lets the team open, print and re-send the file a traveller
 * downloaded weeks earlier — the whole reason the Customers section exists.
 *
 * There are two ways to get one, and which was used matters enough that the
 * caller is told:
 *
 * 1. **The snapshot.** Taken in the traveller's browser when they sent the
 *    enquiry, so it is their document, exactly. Used whenever it is there.
 * 2. **A rebuild.** `buildJourneyPlan` is arithmetic over the traveller's own
 *    choices, and every one of those choices is in `payload` — so the same
 *    selection reproduces the same plan. But it resolves the itineraries as
 *    they are *now*. An itinerary edited or deleted since means the rebuilt
 *    document is not quite what the traveller received, so the caller gets
 *    the list of what has changed and the panel says so on screen.
 *
 * Enquiries sent before snapshots existed have no snapshot, which is why
 * path 2 is not merely a fallback for corruption.
 *
 * A third option was considered and **rejected**: storing the rendered PDF
 * itself. It would be byte-identical, which neither of the above quite is,
 * but the file is produced in the traveller's browser and they are not signed
 * in — so keeping it means accepting an upload from an unauthenticated
 * visitor. That is a security surface worth more than byte-fidelity, and the
 * snapshot is a few tens of kilobytes of JSON against a binary nobody can
 * inspect. Do not reintroduce it without solving the upload problem first.
 */

/** Same list, and same order, as the wizard's own accommodation step. */
const ACCOMMODATION_KEYS = [
  "budget",
  "comfortable",
  "boutique",
  "luxury",
  "ecoLodge",
  "recommend",
] as const;

export type RebuiltDocument = {
  document: JourneyDocument;
  /** How it was obtained — the panel words its notice off this. */
  source: "snapshot" | "rebuilt";
  /**
   * Slugs the traveller chose that no longer resolve to an itinerary. Only
   * ever populated on a rebuild; a snapshot carries its own copy of them.
   */
  missingSlugs: string[];
  /**
   * Slugs whose itinerary was edited after the enquiry came in, so the
   * rebuilt document may read differently from the traveller's copy.
   */
  changedSlugs: string[];
};

/**
 * The UI strings for one locale, as `content/<locale>/ui.json` holds them.
 *
 * Typed from the English file rather than as a loose record: every locale
 * carries the same keys, and taking the shape from a real one means a
 * renamed message is a compile error here instead of an `undefined` printed
 * into somebody's itinerary.
 */
export type UiMessages = typeof import("@/content/en/ui.json");

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Turns a stored enquiry back into a document.
 *
 * `messages` is the `ui.json` for `locale` — the caller loads it, because in
 * the admin panel that is a dynamic import of a language the panel itself is
 * not running in.
 */
export function documentFromRequest({
  request,
  records,
  locale,
  messages,
  whatsappNumber,
}: {
  request: TourRequest;
  records: ItineraryRecord[];
  /** Usually the request's own locale; the team may ask for English instead. */
  locale: string;
  messages: UiMessages;
  /** Printed under the closing notice. From `navigation.contact` content. */
  whatsappNumber: string;
}): RebuiltDocument {
  const resolved: Locale = isLocale(locale) ? locale : defaultLocale;

  /* A snapshot is the traveller's actual document, so it wins — but only if
     it is for the language being asked for. Asking for the English copy of a
     Danish enquiry has to go through a rebuild; there is only ever one
     snapshot, in the language they were reading. */
  const snapshot = documentSnapshotSchema.safeParse(request.documentSnapshot);
  if (snapshot.success && snapshot.data.locale === resolved) {
    const document = snapshot.data.document as JourneyDocument;
    /* Shallow but sufficient: a snapshot that is not a document at all would
       otherwise reach jsPDF and fail there, with nothing useful to say. */
    if (document && Array.isArray(document.itineraries) && document.labels) {
      return { document, source: "snapshot", missingSlugs: [], changedSlugs: [] };
    }
    console.error(`Discarding a malformed document snapshot on ${request.reference}`);
  }

  const t = createTranslator({ locale: resolved, messages, namespace: "customTour" });
  const { payload } = request;

  const bySlug = new Map(records.map((record) => [record.slug, record]));
  const chosen = payload.selectedExperiences
    .map((slug) => bySlug.get(slug))
    .filter((record): record is ItineraryRecord => record !== undefined);

  const missingSlugs = payload.selectedExperiences.filter((slug) => !bySlug.has(slug));
  const changedSlugs = chosen
    .filter((record) => record.updatedAt > request.createdAt)
    .map((record) => record.slug);

  const plan = buildJourneyPlan(
    chosen.map((record) => recordToExperience(record, resolved)),
    payload.dateRange,
  );

  /* Narrowed rather than merely filtered, so the message key below is a
     known literal and a renamed category fails to compile. The payload holds
     whatever the wizard sent, which may name a category since removed. */
  const interestLabels = payload.interests
    .filter((key): key is ItineraryCategory =>
      (ITINERARY_CATEGORY_IDS as readonly string[]).includes(key),
    )
    .map((key) => t(`interests.${key}`));

  const accommodationLabels = payload.accommodation
    .filter((key): key is (typeof ACCOMMODATION_KEYS)[number] =>
      (ACCOMMODATION_KEYS as readonly string[]).includes(key),
    )
    .map((key) => t(`accommodation.${key}`));

  const datesValue =
    payload.dateRange.start && payload.dateRange.end
      ? `${formatDate(payload.dateRange.start, resolved)} – ${formatDate(payload.dateRange.end, resolved)}`
      : "-";

  const document = buildJourneyDocument({
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
    preparedFor: payload.name.trim(),
    /* The date the enquiry was sent, not today. This is a reconstruction of
       the traveller's document, and "prepared on" is part of what it said. */
    preparedOn: formatDate(request.createdAt.slice(0, 10), resolved),
    summaryRows: [
      { label: t("travelersLabel"), value: String(payload.travelers) },
      { label: t("datesLabel"), value: datesValue },
      { label: t("interestsLabel"), value: interestLabels.join(", ") },
      { label: t("accommodationLabel"), value: accommodationLabels.join(", ") },
      ...(payload.accommodationNotes.trim()
        ? [
            {
              label: t("accommodationNotesLabel"),
              value: payload.accommodationNotes.trim(),
            },
          ]
        : []),
    ],
    contactRows: [
      { label: t("contactName"), value: payload.name },
      { label: t("contactEmail"), value: payload.email },
      { label: t("contactPhone"), value: payload.phone },
      ...(payload.country.trim()
        ? [{ label: t("contactCountry"), value: payload.country }]
        : []),
      ...(payload.requirements.trim()
        ? [{ label: t("requirementsLabel"), value: payload.requirements }]
        : []),
    ],
    whatsappNumber,
    formatDayLabel: (from, to) =>
      from === to
        ? t("journeyPlan.dayLabel", { day: from })
        : t("journeyPlan.dayRangeLabel", { from, to }),
    formatDriveLabel: (km, duration) =>
      t("journeyPlan.driveLabel", { km, duration }),
  });

  return { document, source: "rebuilt", missingSlugs, changedSlugs };
}

/** Matches the wizard's own `formatDate`, so both print the same dates. */
function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}
