import "server-only";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { SCHEMA_VERSION, itineraryRecordSchema, type ItineraryRecord } from "./types";

/**
 * Itineraries as one Firestore document each.
 *
 * The blob archive this replaces kept every record in a single JSON file, so
 * saving one itinerary meant reading the whole file, changing one entry and
 * writing it all back. With two admins editing at once, the second write
 * silently discarded the first — a real bug, not a theoretical one. Writing
 * one document at a time removes the race entirely: two people editing
 * different itineraries no longer touch the same bytes.
 *
 * The record shape is unchanged (`./types.ts`), including the per-locale
 * `translations` map, so `toExperience.ts`, the admin form and the wizard did
 * not have to change.
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

  return records.sort((a, b) => a.head.localeCompare(b.head));
}

export async function getRecord(id: string): Promise<ItineraryRecord | null> {
  const doc = await collection().doc(id).get();
  if (!doc.exists) return null;
  const parsed = itineraryRecordSchema.safeParse(doc.data());
  return parsed.success ? parsed.data : null;
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
 * The *Data and migration* import.
 *
 * `replace` really does replace: anything absent from the incoming archive is
 * deleted. That is what the admin panel's wording promises, and it is the
 * only way an export taken elsewhere can be restored faithfully — but it is
 * also destructive, so the deletes and writes go in one batch and either all
 * land or none do. A half-applied import would be worse than a failed one.
 */
export async function writeAll(
  records: ItineraryRecord[],
  mode: "replace" | "merge",
): Promise<ItineraryRecord[]> {
  const { db } = requireFirebase();
  const ref = collection();
  const batch = db.batch();
  const now = new Date().toISOString();

  let operations = records.length;

  if (mode === "replace") {
    const existing = await ref.get();
    const incoming = new Set(records.map((record) => record.id));
    for (const doc of existing.docs) {
      if (!incoming.has(doc.id)) {
        batch.delete(doc.ref);
        operations += 1;
      }
    }
  }

  /* Firestore batches cap at 500 operations. Splitting across batches would
     give up the all-or-nothing guarantee that makes a destructive import
     safe, so refuse loudly instead — an archive this large means the import
     needs rethinking, not silently applying in halves. */
  if (operations > 500) {
    throw new Error(
      `Import needs ${operations} writes; a single atomic batch allows 500. ` +
        `Split the archive or import in stages.`,
    );
  }

  const written = records.map((record) => ({ ...record, updatedAt: now }));
  for (const record of written) {
    batch.set(ref.doc(record.id), record);
  }

  await batch.commit();
  return written;
}

export { SCHEMA_VERSION };
