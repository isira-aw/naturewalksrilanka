"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { blobItineraryStore } from "@/lib/itineraries/store";
import { useItineraries } from "@/lib/itineraries/useItineraries";
import type { ItineraryRecord } from "@/lib/itineraries/types";
import { AdminSignIn } from "./AdminSignIn";
import { ItineraryList } from "./ItineraryList";
import { ItineraryForm } from "./ItineraryForm";
import { TranslationsPanel } from "./TranslationsPanel";
import { DataPanel } from "./DataPanel";

/**
 * The whole admin tool: a sidebar and one panel at a time.
 *
 * Custom tour optimisation comes first because it is the only section anyone
 * opens this page to use — the other two exist in service of it.
 */
const SECTIONS = [
  { id: "itineraries", label: "Custom tour optimisation" },
  { id: "translations", label: "Translations" },
  { id: "data", label: "Data and migration" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function AdminApp() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [section, setSection] = useState<SectionId>("itineraries");
  const [editing, setEditing] = useState<ItineraryRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const { records, loaded, refresh } = useItineraries();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setSignedIn(Boolean(data.signedIn));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (record: ItineraryRecord) => {
      await blobItineraryStore.save(record);
      refresh();
      setEditing(null);
      setAdding(false);
    },
    [refresh]
  );

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
    setSignedIn(false);
  }

  if (signedIn === null) {
    return <p className="px-6 py-24 text-center text-sm text-charcoal/45">Loading…</p>;
  }

  if (!signedIn) {
    return <AdminSignIn onSignedIn={() => setSignedIn(true)} />;
  }

  const showingForm = adding || editing !== null;

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-6 md:px-10 lg:py-12">
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <nav
          aria-label="Admin sections"
          className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start"
        >
          <p className="font-utility text-[11px] uppercase tracking-wide text-charcoal/40">
            Nature Walk Sri Lanka
          </p>
          <ul className="mt-3 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
            {SECTIONS.map((entry) => (
              <li key={entry.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => {
                    setSection(entry.id);
                    setEditing(null);
                    setAdding(false);
                  }}
                  aria-current={section === entry.id ? "page" : undefined}
                  className={cn(
                    "min-h-10 w-full whitespace-nowrap rounded-full px-4 text-left text-sm transition-colors lg:whitespace-normal",
                    section === entry.id
                      ? "bg-forest text-warm-white"
                      : "text-charcoal/70 hover:bg-stone hover:text-charcoal"
                  )}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 min-h-10 rounded-full border border-stone-dark px-4 font-utility text-xs uppercase tracking-wide text-charcoal/60 transition-colors hover:border-forest hover:text-forest"
          >
            Sign out
          </button>
        </nav>

        <section aria-label="Admin panel" className="min-w-0 rounded-2xl border border-stone-dark bg-warm-white p-5 sm:p-7 lg:p-9">
          {section === "itineraries" &&
            (showingForm ? (
              <ItineraryForm
                initial={editing ?? undefined}
                existing={records}
                onSave={save}
                onCancel={() => {
                  setEditing(null);
                  setAdding(false);
                }}
              />
            ) : (
              <ItineraryList
                records={records}
                loaded={loaded}
                onAdd={() => setAdding(true)}
                onEdit={setEditing}
                onToggleHidden={(record) => void save({ ...record, hidden: !record.hidden })}
                onDelete={(record) => {
                  if (!window.confirm(`Delete “${record.head}”? This cannot be undone.`)) return;
                  void blobItineraryStore.remove(record.id).then(refresh);
                }}
              />
            ))}

          {section === "translations" && (
            <TranslationsPanel records={records} onSave={save} />
          )}

          {section === "data" && <DataPanel records={records} onImported={refresh} />}
        </section>
      </div>
    </div>
  );
}
