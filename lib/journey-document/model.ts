/**
 * The shape both take-away documents are built from.
 *
 * The Review step assembles this once, and the PDF and the Word file are two
 * renderings of the same object — so the traveller's download and the copy
 * attached to the WhatsApp chat can never drift apart.
 */

export type JourneyHighlight = {
  name: string;
  note?: string;
  image?: string;
};

export type JourneyItinerary = {
  slug: string;
  title: string;
  location: string;
  bestTime: string;
  duration: string;
  summary: string;
  description: string;
  /** Public paths, e.g. `/images/story-1.jpg`. Resolved to data URLs at build time. */
  images: string[];
  highlights: JourneyHighlight[];
};

export type JourneyRow = { label: string; value: string };

/** Every string the documents print, so they follow the wizard's locale. */
export type JourneyDocumentLabels = {
  title: string;
  tagline: string;
  preparedFor: string;
  preparedOn: string;
  summaryTitle: string;
  itinerariesTitle: string;
  aiRouteTitle: string;
  contactTitle: string;
  highlightsTitle: string;
  bestTimeLabel: string;
  durationLabel: string;
  footer: string;
  fileName: string;
};

export type JourneyDocument = {
  labels: JourneyDocumentLabels;
  preparedFor: string;
  preparedOn: string;
  summaryRows: JourneyRow[];
  contactRows: JourneyRow[];
  itineraries: JourneyItinerary[];
  aiRoute: string[];
  /** Cover photograph — the first selected itinerary's, or the site fallback. */
  coverImage: string;
};

/** Every image the document will need, de-duplicated and in draw order. */
export function collectImageSources(doc: JourneyDocument): string[] {
  const sources = [doc.coverImage];
  for (const itinerary of doc.itineraries) {
    sources.push(...itinerary.images);
    for (const highlight of itinerary.highlights) {
      if (highlight.image) sources.push(highlight.image);
    }
  }
  return Array.from(new Set(sources.filter(Boolean)));
}

/** `sri-lanka-journey-2026-09-08.pdf` — stable, sortable, no spaces. */
export function documentFileName(doc: JourneyDocument, extension: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${doc.labels.fileName}-${stamp}.${extension}`;
}
