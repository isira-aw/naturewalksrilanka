"use client";

import { useCallback, useEffect, useState } from "react";
import { itineraryStore } from "@/lib/itineraries/browserStore";
import type { ItinerarySummary } from "@/lib/itineraries/store";
import type { ItineraryRecord } from "@/lib/itineraries/types";
import { ItineraryList } from "./ItineraryList";
import { ItineraryForm } from "./ItineraryForm";

/**
 * The itinerary section: a paged list, and the editor it opens into.
 *
 * The list reads summaries, a page at a time. It used to fetch the whole
 * archive — every record's prose, highlights, blur map and four inline
 * translations — in order to render rows showing a title, a category and some
 * status dots.
 *
 * The editor does need a whole record, so it fetches the one being opened.
 * That is one small request instead of a large one covering everything you
 * did not open.
 */
export function ItinerariesPanel() {
  const [items, setItems] = useState<ItinerarySummary[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Paging is driven by a token rather than by calling a loader: the fetch
     happens in an effect, and setting state synchronously inside one is the
     cascading-render pattern React warns about. `reload` refetches the first
     page after a save or a delete. */
  const [loadMoreToken, setLoadMoreToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [reload, setReload] = useState(0);

  /* `undefined` is the list, `null` is adding, a record is editing it. */
  const [editing, setEditing] = useState<ItineraryRecord | null | undefined>(undefined);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const page = await itineraryStore.page(loadMoreToken);
      if (cancelled) return;

      if ("error" in page) {
        setError(page.error);
      } else {
        setError(null);
        setItems((current) => (loadMoreToken ? [...current, ...page.items] : page.items));
        setCursor(page.nextCursor);
      }
      setLoaded(true);
      setLoadingMore(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadMoreToken, reload]);

  /** Back to the list, with the first page refetched so it reflects the edit. */
  const closeEditor = useCallback(() => {
    setEditing(undefined);
    setLoadMoreToken(undefined);
    setReload((n) => n + 1);
  }, []);

  const save = useCallback(
    async (record: ItineraryRecord) => {
      await itineraryStore.save(record);
      closeEditor();
    },
    [closeEditor],
  );

  async function open(id: string) {
    setOpening(true);
    setError(null);
    const found = await itineraryStore.get(id);
    setOpening(false);

    if (!found) {
      setError("Could not open that itinerary.");
      return;
    }
    setEditing(found);
  }

  /**
   * Hiding and showing need the whole record, not the row.
   *
   * A row is a summary, and saving one back would erase everything the list
   * does not carry — which is most of the itinerary.
   */
  async function setHidden(item: ItinerarySummary, hidden: boolean) {
    const full = await itineraryStore.get(item.id);
    if (!full) {
      setError("Could not open that itinerary.");
      return;
    }
    await itineraryStore.save({ ...full, hidden });
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, hidden } : entry)),
    );
  }

  if (editing !== undefined) {
    return (
      <ItineraryForm
        initial={editing ?? undefined}
        onSave={save}
        onCancel={closeEditor}
      />
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <ItineraryList
        items={items}
        loaded={loaded && !opening}
        loadingMore={loadingMore}
        hasMore={Boolean(cursor)}
        onAdd={() => setEditing(null)}
        onEdit={(id) => void open(id)}
        onToggleHidden={(item) => void setHidden(item, !item.hidden)}
        onDelete={(item) => {
          if (!window.confirm(`Delete “${item.head}”? This cannot be undone.`)) return;
          void itineraryStore.remove(item.id).then(() => {
            setLoadMoreToken(undefined);
            setReload((n) => n + 1);
          });
        }}
        onLoadMore={() => {
          setLoadingMore(true);
          setLoadMoreToken(cursor);
        }}
      />
    </div>
  );
}
