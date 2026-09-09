"use client";

import { useCallback, useEffect, useState } from "react";
import { localItineraryStore } from "./store";
import type { ItineraryRecord } from "./types";

/**
 * Everything in the store, kept in step with it. Used by both the admin page
 * and the wizard, so an itinerary added in one tab shows up in the other
 * without a reload.
 *
 * `loaded` starts false and only turns true after the first read: the store is
 * a browser API, so the server render and the first client render must agree
 * on "nothing yet" or React will report a hydration mismatch.
 */
export function useItineraries() {
  const [records, setRecords] = useState<ItineraryRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    void localItineraryStore.list().then((next) => {
      setRecords(next);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    refresh();
    return localItineraryStore.subscribe(refresh);
  }, [refresh]);

  return { records, loaded, refresh };
}
