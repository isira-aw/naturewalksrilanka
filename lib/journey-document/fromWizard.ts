"use client";

import type { Experience } from "@/lib/content/schema";
import type { JourneyPlan } from "@/lib/journey/plan";
import { formatDrive } from "@/lib/journey/plan";
import type { JourneyDocument, JourneyDocumentLabels, JourneyRow } from "./model";

/** Used on the cover when the traveller has picked nothing with a photograph. */
export const FALLBACK_COVER = "/images/hero-1.jpg";

export type JourneyDocumentInput = {
  labels: JourneyDocumentLabels;
  plan: JourneyPlan;
  preparedFor: string;
  preparedOn: string;
  summaryRows: JourneyRow[];
  contactRows: JourneyRow[];
  whatsappNumber: string;
  /** Localised: `Day {day}`, `Days {from}–{to}` and the drive line. */
  formatDayLabel: (from: number, to: number) => string;
  formatDriveLabel: (km: number, duration: string) => string;
};

/**
 * Assembles the one object the PDF and the Word file are both rendered from.
 *
 * Both the plan step and the review step offer a download, and they must
 * produce byte-for-byte the same document — so neither builds one itself; both
 * call this.
 */
export function buildJourneyDocument(input: JourneyDocumentInput): JourneyDocument {
  const { plan } = input;

  const itineraries = plan.stops.map((stop) => {
    const experience = stop.experience;
    return {
      slug: experience.slug,
      title: experience.title,
      location: experience.location,
      bestTime: experience.bestTime,
      duration: experience.duration,
      summary: experience.summary,
      description: experience.description,
      images: experience.images,
      highlights: experience.highlights,
      backgroundImage: backgroundFor(experience),
      order: stop.order,
      dayLabel: input.formatDayLabel(stop.startDay, stop.endDay),
      driveLabel:
        stop.legKm > 0
          ? input.formatDriveLabel(stop.legKm, formatDrive(stop.legMinutes))
          : undefined,
    };
  });

  return {
    labels: input.labels,
    preparedFor: input.preparedFor,
    preparedOn: input.preparedOn,
    summaryRows: input.summaryRows,
    contactRows: input.contactRows,
    itineraries,
    route: itineraries.map((itinerary) => ({
      order: itinerary.order,
      title: itinerary.title,
      location: itinerary.location,
      dayLabel: itinerary.dayLabel,
      driveLabel: itinerary.driveLabel,
    })),
    mapStops: plan.stops.map((stop) => ({
      lat: stop.position.lat,
      lng: stop.position.lng,
      label: stop.experience.title,
    })),
    whatsappNumber: input.whatsappNumber,
    coverImage: plan.stops[0]?.experience.images[0] ?? FALLBACK_COVER,
  };
}

/**
 * A "what you might see" photograph wherever the itinerary has one: those
 * pages are about the sights, so a leopard behind the text beats a repeat of
 * the header photograph. Falls back to the itinerary's own first picture.
 */
function backgroundFor(experience: Experience) {
  const highlight = experience.highlights.find((entry) => entry.image);
  return highlight?.image ?? experience.images[0] ?? FALLBACK_COVER;
}
