"use client";

import {
  SCHEMA_VERSION,
  itineraryArchiveSchema,
  itineraryRecordSchema,
  type ItineraryArchive,
  type ItineraryRecord,
} from "./types";

/**
 * Where itineraries live.
 *
 * There is no backend and no database yet, so today the only implementation
 * keeps records in the browser's `localStorage`. Everything above this file
 * talks to the `ItineraryStore` interface instead of to `localStorage`, and
 * every record carries a stable id and a schema version, so standing a real
 * backend up later is one new implementation of this interface plus a single
 * `importArchive` of whatever `exportArchive` produced. No field is
 * browser-specific and nothing has to be re-keyed, so no data is lost in the
 * move.
 *
 * See `docs/itinerary-storage.md` for the migration steps.
 */
export interface ItineraryStore {
  list(): Promise<ItineraryRecord[]>;
  get(id: string): Promise<ItineraryRecord | null>;
  save(record: ItineraryRecord): Promise<ItineraryRecord>;
  remove(id: string): Promise<void>;
  exportArchive(): Promise<ItineraryArchive>;
  /** Replaces everything, or merges by id when `mode` is `"merge"`. */
  importArchive(archive: unknown, mode?: "replace" | "merge"): Promise<ItineraryRecord[]>;
  subscribe(listener: () => void): () => void;
}

const STORAGE_KEY = "nwsl.itineraries.v1";

/** Broadcast within this tab; `storage` events already cover the other tabs. */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readRaw(): ItineraryRecord[] {
  if (typeof window === "undefined") return [];
  let text: string | null = null;
  try {
    text = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing, or storage disabled entirely.
    return [];
  }
  if (!text) return [];

  try {
    const parsed = itineraryArchiveSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return [];
    return migrate(parsed.data);
  } catch {
    return [];
  }
}

function writeRaw(records: ItineraryRecord[]) {
  if (typeof window === "undefined") return;
  const archive: ItineraryArchive = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
  } catch (error) {
    // Base64 photographs are large and the quota is a few megabytes: tell the
    // caller rather than silently dropping the itinerary that was just saved.
    throw new Error(
      "Could not save. Browser storage is full — remove some itineraries or use smaller photographs.",
      { cause: error }
    );
  }
  notify();
}

/**
 * Brings an archive written by an older build up to the current shape. There
 * is only one version so far, so this is a pass-through — it exists so the
 * first real migration has an obvious home and old exports keep importing.
 */
function migrate(archive: ItineraryArchive): ItineraryRecord[] {
  if (archive.schemaVersion > SCHEMA_VERSION) return archive.records;
  return archive.records;
}

export const localItineraryStore: ItineraryStore = {
  async list() {
    return readRaw().sort((a, b) => a.head.localeCompare(b.head));
  },

  async get(id) {
    return readRaw().find((record) => record.id === id) ?? null;
  },

  async save(record) {
    const records = readRaw();
    const next: ItineraryRecord = { ...record, updatedAt: new Date().toISOString() };
    const index = records.findIndex((existing) => existing.id === next.id);
    if (index >= 0) records[index] = next;
    else records.push(next);
    writeRaw(records);
    return next;
  },

  async remove(id) {
    writeRaw(readRaw().filter((record) => record.id !== id));
  },

  async exportArchive() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      records: readRaw(),
    };
  },

  async importArchive(archive, mode = "replace") {
    const parsed = itineraryArchiveSchema.safeParse(archive);
    if (!parsed.success) throw new Error("That file is not an itinerary export.");
    const incoming = migrate(parsed.data);

    if (mode === "replace") {
      writeRaw(incoming);
      return incoming;
    }

    const byId = new Map(readRaw().map((record) => [record.id, record]));
    for (const record of incoming) byId.set(record.id, record);
    const merged = [...byId.values()];
    writeRaw(merged);
    return merged;
  },

  subscribe(listener) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
};

/** Validates one record coming from outside — an import, or a form submission. */
export function parseRecord(value: unknown) {
  return itineraryRecordSchema.safeParse(value);
}
