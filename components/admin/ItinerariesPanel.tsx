"use client";

import { useCallback, useState } from "react";
import { itineraryStore } from "@/lib/itineraries/browserStore";
import { useItineraries } from "@/lib/itineraries/useItineraries";
import type { ItineraryRecord } from "@/lib/itineraries/types";
import { ItineraryList } from "./ItineraryList";
import { ItineraryForm } from "./ItineraryForm";

/**
 * The itinerary section: the list, and the editor it opens into.
 *
 * The archive fetch lives here rather than in the shell. It used to run the
 * moment the panel opened, whichever section you were heading for, so
 * answering one review still downloaded every itinerary's prose, highlights
 * and five locales of translation. Now only the two sections that need that
 * data ask for it.
 */
export function ItinerariesPanel() {
  const { records, loaded, refresh } = useItineraries();
  const [editing, setEditing] = useState<ItineraryRecord | null>(null);
  const [adding, setAdding] = useState(false);

  const save = useCallback(
    async (record: ItineraryRecord) => {
      await itineraryStore.save(record);
      refresh();
      setEditing(null);
      setAdding(false);
    },
    [refresh]
  );

  if (adding || editing !== null) {
    return (
      <ItineraryForm
        initial={editing ?? undefined}
        existing={records}
        onSave={save}
        onCancel={() => {
          setEditing(null);
          setAdding(false);
        }}
      />
    );
  }

  return (
    <ItineraryList
      records={records}
      loaded={loaded}
      onAdd={() => setAdding(true)}
      onEdit={setEditing}
      onToggleHidden={(record) => void save({ ...record, hidden: !record.hidden })}
      onDelete={(record) => {
        if (!window.confirm(`Delete “${record.head}”? This cannot be undone.`)) return;
        void itineraryStore.remove(record.id).then(refresh);
      }}
    />
  );
}
