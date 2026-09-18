"use client";

import { itineraryArchiveSchema, type ItineraryArchive, type ItineraryRecord } from "./types";
import type { ItineraryPage } from "./store";

/**
 * The browser's view of the itineraries.
 *
 * This holds no data of its own. Every method is one call to a route handler
 * (`app/api/itineraries/route.ts` for reads, `app/api/admin/itineraries/route.ts`
 * for writes), which is the only code that touches Firestore — see
 * `lib/itineraries/store.ts` for the server side. So there is one store, one
 * database, and an itinerary added on one device shows up on every other one.
 *
 * A failed read renders as an empty list rather than throwing, because the
 * custom-tour wizard shows suggestions as an enhancement and has an empty
 * state already. A failed *write* throws, so the admin sees that their save
 * did not happen.
 */

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

export const itineraryStore = {
  /**
   * One page of the admin list, as summaries.
   *
   * Separate from `list()`, which the wizard uses and which needs whole
   * records so it can filter and render them. This one is the admin list, and
   * asks only for what a row shows.
   */
  async page(cursor?: string): Promise<ItineraryPage | { error: string }> {
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/admin/itineraries?${params}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        return {
          error:
            response.status === 503
              ? "Firebase is not reachable, so itineraries cannot be listed."
              : "Could not load itineraries.",
        };
      }
      return (await response.json()) as ItineraryPage;
    } catch {
      return { error: "Could not reach the server." };
    }
  },

  /** One record in full, for the editor. */
  async get(id: string): Promise<ItineraryRecord | null> {
    try {
      const response = await fetch(`/api/admin/itineraries?id=${encodeURIComponent(id)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return null;
      const { record } = (await response.json()) as { record: ItineraryRecord };
      return record;
    } catch {
      return null;
    }
  },

  /* Already ordered by `head` in `store.ts`, where the records come from
     Firestore; re-sorting the same list here would be one ordering rule kept
     in two places, waiting to disagree. */
  async list() {
    const { records } = await fetchArchive();
    return records;
  },

  async save(record: ItineraryRecord): Promise<ItineraryRecord> {
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

  async remove(id: string): Promise<void> {
    const response = await fetch(`/api/admin/itineraries?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not delete.");
    notify();
  },

  subscribe(listener: () => void) {
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
