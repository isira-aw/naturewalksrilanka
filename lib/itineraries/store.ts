import "server-only";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  SCHEMA_VERSION,
  itineraryRecordSchema,
  type ItineraryArchive,
  type ItineraryRecord,
} from "./types";

/**
 * Itineraries as one Firestore document each. The only store there is.
 *
 * Firestore is the one source of truth. There is no second backend and no
 * runtime choice to make, so there is no indirection here either — route
 * handlers call these functions directly.
 *
 * Named `store.ts` to match `lib/reviews/store.ts` and
 * `lib/tourRequests/store.ts` — in this repository a `store.ts` is always the
 * server-side Firestore access for one collection. The browser's fetch
 * wrapper for these same records is `browserStore.ts`, next door.
 *
 * One document per record, rather than one file holding all of them, is what
 * removes the write race: with a single JSON file, two admins editing
 * different itineraries at the same time meant the second write silently
 * discarded the first.
 */

function collection() {
  const { db } = requireFirebase();
  return db.collection(COLLECTIONS.itineraries);
}

/**
 * Every record, oldest schema problems skipped rather than fatal.
 *
 * One malformed document should not take down the whole custom-tour page, so
 * a record that fails validation is logged and left out. Silently returning
 * fewer itineraries is bad; returning none is worse.
 */
export async function listRecords(): Promise<ItineraryRecord[]> {
  const snapshot = await collection().get();
  const records: ItineraryRecord[] = [];

  for (const doc of snapshot.docs) {
    const parsed = itineraryRecordSchema.safeParse(doc.data());
    if (parsed.success) {
      records.push(parsed.data);
    } else {
      console.error(`Skipping malformed itinerary ${doc.id}:`, parsed.error.issues);
    }
  }

  return records.sort(byPlacement);
}

/**
 * The order the wizard offers itineraries in, and the order the admin list
 * shows them in — one rule, so the team sees what a traveller will.
 *
 * Featured first, then anything with an explicit position, then everything
 * else alphabetically. An itinerary with no position sorts after every
 * itinerary that has one, which is how the whole list behaved before
 * positions existed: set none and nothing moves.
 */
function byPlacement(a: ItineraryRecord, b: ItineraryRecord) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;

  const left = a.sortOrder ?? Number.POSITIVE_INFINITY;
  const right = b.sortOrder ?? Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;

  return a.head.localeCompare(b.head);
}

/** Creates or replaces exactly one itinerary. */
export async function saveRecord(record: ItineraryRecord): Promise<ItineraryRecord> {
  const next = { ...record, updatedAt: new Date().toISOString() };
  await collection().doc(next.id).set(next);
  return next;
}

export async function deleteRecord(id: string): Promise<void> {
  await collection().doc(id).delete();
}

/**
 * Every record wrapped in the envelope the client store expects.
 *
 * The envelope outlived the export it was shaped for — `GET /api/itineraries`
 * still answers in this form, and the browser store still parses it — so the
 * `schemaVersion` stays meaningful even though nothing writes a file any more.
 */
export async function readArchiveEnvelope(): Promise<ItineraryArchive> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records: await listRecords(),
  };
}

export { SCHEMA_VERSION };
