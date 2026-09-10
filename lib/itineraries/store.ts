"use client";

import {
  itineraryArchiveSchema,
  type ItineraryArchive,
  type ItineraryRecord,
} from "./types";

/**
 * Where itineraries live.
 *
 * Backed by a single JSON blob on Vercel Blob storage (see
 * `lib/itineraries/blobArchive.ts` and `app/api/itineraries/route.ts` /
 * `app/api/admin/itineraries/route.ts`) rather than the browser: an itinerary
 * added on one device now shows up on every other device and browser,
 * because the record lives on the server instead of in that one browser's
 * `localStorage`. See `docs/itinerary-storage.md`.
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

/** Broadcast within this tab; other tabs/devices pick up changes on their next poll or refresh. */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

async function fetchArchive(): Promise<ItineraryArchive> {
  const response = await fetch("/api/itineraries", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return { schemaVersion: 1, records: [] };
  const parsed = itineraryArchiveSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : { schemaVersion: 1, records: [] };
}

export const blobItineraryStore: ItineraryStore = {
  async list() {
    const { records } = await fetchArchive();
    return records.sort((a, b) => a.head.localeCompare(b.head));
  },

  async get(id) {
    const { records } = await fetchArchive();
    return records.find((record) => record.id === id) ?? null;
  },

  async save(record) {
    const response = await fetch("/api/admin/itineraries", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error === "unauthorized" ? "Signed out — sign in again to save." : "Could not save.");
    }
    const saved = (await response.json()) as ItineraryRecord;
    notify();
    return saved;
  },

  async remove(id) {
    const response = await fetch(`/api/admin/itineraries?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not delete.");
    notify();
  },

  async exportArchive() {
    return fetchArchive();
  },

  async importArchive(archive, mode = "replace") {
    const parsed = itineraryArchiveSchema.safeParse(archive);
    if (!parsed.success) throw new Error("That file is not an itinerary export.");

    const response = await fetch("/api/admin/itineraries", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: parsed.data, mode }),
    });
    if (!response.ok) throw new Error("Could not import.");
    const written = (await response.json()) as ItineraryArchive;
    notify();
    return written.records;
  },

  subscribe(listener) {
    listeners.add(listener);

    /* Refetch when the tab comes back, not on a timer.
       The old 30-second poll re-downloaded the whole archive for every open
       tab forever, including tabs nobody was looking at and every visitor
       sitting on the custom-tour page. Itineraries change a few times a week
       at most; the only moment a stale list actually matters is when someone
       returns to a tab they left open, which is exactly what this catches. */
    const onFocus = () => {
      if (document.visibilityState === "visible") listener();
    };
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  },
};
