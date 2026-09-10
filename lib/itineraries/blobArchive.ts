import "server-only";
import { head, put } from "@vercel/blob";
import {
  SCHEMA_VERSION,
  itineraryArchiveSchema,
  type ItineraryArchive,
  type ItineraryRecord,
} from "./types";

/**
 * The one JSON blob every visitor's browser and every admin session reads
 * and writes — this is what replaced `localStorage` so an itinerary added on
 * one device shows up everywhere else. See `docs/itinerary-storage.md`.
 */
const PATHNAME = "itineraries/archive.json";

const emptyArchive: ItineraryArchive = {
  schemaVersion: SCHEMA_VERSION,
  exportedAt: new Date(0).toISOString(),
  records: [],
};

export async function readArchive(): Promise<ItineraryArchive> {
  let url: string;
  try {
    url = (await head(PATHNAME)).url;
  } catch {
    // Nothing written yet.
    return emptyArchive;
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return emptyArchive;

  const parsed = itineraryArchiveSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : emptyArchive;
}

export async function writeArchive(records: ItineraryRecord[]): Promise<ItineraryArchive> {
  const archive: ItineraryArchive = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records,
  };
  await put(PATHNAME, JSON.stringify(archive), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
  return archive;
}
