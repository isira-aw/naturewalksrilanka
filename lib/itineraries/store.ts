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

  return records.sort((a, b) => a.head.localeCompare(b.head));
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

/**
 * Every record wrapped in the envelope the admin export and the client store
 * expect. `exportedAt` is stamped now because the export *is* now — the
 * records carry their own `updatedAt`.
 */
export async function readArchiveEnvelope(): Promise<ItineraryArchive> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records: await listRecords(),
  };
}

export { SCHEMA_VERSION };
