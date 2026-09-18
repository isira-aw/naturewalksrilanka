"use client";

import { useItineraries } from "@/lib/itineraries/useItineraries";
import { DataPanel } from "./DataPanel";

/** Export and import, with its own read of the archive. */
export function DataSection() {
  const { records, refresh } = useItineraries();
  return <DataPanel records={records} onImported={refresh} />;
}
