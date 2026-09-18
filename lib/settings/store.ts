import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, SETTINGS_DOCS } from "@/lib/firebase/collections";
import {
  DEFAULT_CUSTOM_TOUR_SETTINGS,
  parseSettings,
  type CustomTourSettings,
} from "./customTour";

/**
 * The wizard's settings, in Firestore.
 *
 * Reading never throws and never reports a failure: the custom-tour page is
 * public, and a Firestore outage must degrade it to the built-in defaults
 * rather than take it down. That is the same reasoning as the itinerary read
 * on the same page, which answers 503 and renders an empty suggestion list.
 */
function document() {
  return adminDb()?.collection(COLLECTIONS.settings).doc(SETTINGS_DOCS.customTour) ?? null;
}

export async function readCustomTourSettings(): Promise<CustomTourSettings> {
  const ref = document();
  if (!ref) return DEFAULT_CUSTOM_TOUR_SETTINGS;

  try {
    const doc = await ref.get();
    if (!doc.exists) return DEFAULT_CUSTOM_TOUR_SETTINGS;
    return parseSettings(doc.data());
  } catch (error) {
    console.error("Could not read the custom tour settings:", error);
    return DEFAULT_CUSTOM_TOUR_SETTINGS;
  }
}

/** Writing does throw: an admin who pressed Save must be told it did not. */
export async function writeCustomTourSettings(
  settings: CustomTourSettings,
  updatedBy: string,
): Promise<CustomTourSettings> {
  const ref = document();
  if (!ref) throw new Error("Firebase is not configured.");

  const next: CustomTourSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await ref.set(next);
  return next;
}
