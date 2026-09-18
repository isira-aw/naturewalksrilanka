"use client";

import { useCallback } from "react";
import { itineraryStore } from "@/lib/itineraries/browserStore";
import { useItineraries } from "@/lib/itineraries/useItineraries";
import type { ItineraryRecord } from "@/lib/itineraries/types";
import { TranslationsPanel } from "./TranslationsPanel";

/** Translations needs the same archive the itinerary list does, so it asks
    for its own copy rather than the shell fetching one for every section. */
export function TranslationsSection() {
  const { records, refresh } = useItineraries();

  const save = useCallback(
    async (record: ItineraryRecord) => {
      await itineraryStore.save(record);
      refresh();
    },
    [refresh]
  );

  return <TranslationsPanel records={records} onSave={save} />;
}
