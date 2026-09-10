import "server-only";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { readArchive, writeArchive } from "./blobArchive";
import * as firestore from "./firestoreStore";
import { SCHEMA_VERSION, type ItineraryArchive, type ItineraryRecord } from "./types";

/**
 * Where itineraries live — Firestore when it is configured, the old Vercel
 * Blob archive when it is not.
 *
 * The same fallback shape as the admin sign-in, and for the same reason: the
 * migration cannot be atomic across a deploy, and a half-configured
 * environment must still serve the custom-tour page rather than showing
 * visitors an error. Once the Firestore data is verified, delete
 * `blobArchive.ts`, drop `@vercel/blob`, and let this file call Firestore
 * directly.
 *
 * Note the asymmetry that matters: on Firestore a save writes one document,
 * so two admins editing different itineraries no longer overwrite each
 * other. On the blob it is still a whole-file read-modify-write, because
 * that is all a single JSON file can do.
 */

export function usingFirestore() {
  return isFirebaseConfigured();
}

export async function listRecords(): Promise<ItineraryRecord[]> {
  if (usingFirestore()) return firestore.listRecords();
  const { records } = await readArchive();
  return records.sort((a, b) => a.head.localeCompare(b.head));
}

export async function saveRecord(record: ItineraryRecord): Promise<ItineraryRecord> {
  if (usingFirestore()) return firestore.saveRecord(record);

  const next = { ...record, updatedAt: new Date().toISOString() };
  const { records } = await readArchive();
  const index = records.findIndex((existing) => existing.id === next.id);
  if (index >= 0) records[index] = next;
  else records.push(next);
  await writeArchive(records);
  return next;
}

export async function deleteRecord(id: string): Promise<void> {
  if (usingFirestore()) return firestore.deleteRecord(id);

  const { records } = await readArchive();
  await writeArchive(records.filter((record) => record.id !== id));
}

export async function writeAll(
  records: ItineraryRecord[],
  mode: "replace" | "merge",
): Promise<ItineraryRecord[]> {
  if (usingFirestore()) return firestore.writeAll(records, mode);

  if (mode === "merge") {
    const { records: current } = await readArchive();
    const byId = new Map(current.map((record) => [record.id, record]));
    for (const record of records) byId.set(record.id, record);
    const written = await writeArchive([...byId.values()]);
    return written.records;
  }

  const written = await writeArchive(records);
  return written.records;
}

/** The archive envelope the admin export and the client store expect. */
export async function readArchiveEnvelope(): Promise<ItineraryArchive> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records: await listRecords(),
  };
}
