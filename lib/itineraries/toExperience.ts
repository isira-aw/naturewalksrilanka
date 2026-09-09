import type { Experience } from "@/lib/content/schema";
import { provinceLabel } from "@/lib/geo/sriLanka";
import type { ItineraryRecord } from "./types";

/** Stands in for an itinerary saved without a photograph. */
export const ITINERARY_FALLBACK_IMAGE = "/images/placeholder-destination.jpg";

/**
 * Renders an admin record as the `Experience` the wizard already knows how to
 * show, in one locale. A translation is used when it is ready; otherwise the
 * English original stands in, so a half-translated itinerary is still a
 * complete itinerary to the traveller rather than a set of blanks.
 *
 * Language-neutral fields — province, photographs, highlight photographs —
 * are never translated and always come from the record itself.
 */
export function recordToExperience(record: ItineraryRecord, locale: string): Experience {
  const translation = locale === "en" ? undefined : record.translations[locale];
  const fields = translation?.status === "ready" ? translation.fields : undefined;

  const head = fields?.head ?? record.head;
  const content1 = fields?.content1 ?? record.content1;
  const content2 = fields?.content2 ?? record.content2;

  /* The two content blocks are one piece of prose in the dialog; the first
     sentence of the first block doubles as the card's one-line summary. */
  const description = [content1, content2].filter((part) => part && part.trim()).join("\n\n");

  return {
    slug: record.slug,
    category: record.category,
    title: head,
    location: provinceLabel(record.province),
    province: record.province,
    bestTime: fields?.bestTime ?? record.bestTime ?? "",
    duration: fields?.suggestedLength ?? record.suggestedLength ?? "",
    summary: firstSentence(content1),
    description,
    images: record.images.length > 0 ? record.images : [ITINERARY_FALLBACK_IMAGE],
    highlights: record.highlights.map((highlight, index) => ({
      name: fields?.highlights[index]?.name ?? highlight.name,
      note: fields?.highlights[index]?.description ?? highlight.description,
      image: highlight.image,
    })),
  };
}

/** Everything the wizard should see: visible records, in this locale. */
export function visibleExperiences(records: ItineraryRecord[], locale: string): Experience[] {
  return records
    .filter((record) => !record.hidden && record.slug && record.head)
    .map((record) => recordToExperience(record, locale));
}

function firstSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  const sentence = (match ? match[0] : trimmed).trim();
  return sentence.length > 180 ? `${sentence.slice(0, 177).trimEnd()}…` : sentence;
}
