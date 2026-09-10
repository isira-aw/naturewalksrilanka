"use client";

import { useRef, useState } from "react";
import { blobItineraryStore } from "@/lib/itineraries/store";
import { SCHEMA_VERSION, type ItineraryRecord } from "@/lib/itineraries/types";
import { approximateBytes, formatBytes } from "@/lib/itineraries/imageFile";

/**
 * The migration hatch.
 *
 * Itineraries live on the server (a Vercel Blob archive, see
 * `lib/itineraries/blobArchive.ts`) rather than in one browser, so this panel
 * is a backup hatch rather than the only way the data survives: an export is
 * the complete archive — every record, every photograph, every translation,
 * with the stable ids intact.
 */
export function DataPanel({
  records,
  onImported,
}: {
  records: ItineraryRecord[];
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bytes = records.reduce(
    (sum, record) =>
      sum +
      record.images.reduce((n, src) => n + approximateBytes(src), 0) +
      record.highlights.reduce((n, h) => n + (h.image ? approximateBytes(h.image) : 0), 0),
    0
  );

  async function handleExport() {
    setError(null);
    const archive = await blobItineraryStore.exportArchive();
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nwsl-itineraries-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setMessage(`Exported ${archive.records.length} itineraries.`);
  }

  async function handleImport(file: File, mode: "replace" | "merge") {
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text());
      const imported = await blobItineraryStore.importArchive(parsed, mode);
      onImported();
      setMessage(`Imported — ${imported.length} itineraries now stored.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file could not be imported.");
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-2xl text-charcoal">Data and migration</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">
        Itineraries are stored on the server and shared across every browser and device. Export a
        copy now and then as a backup.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Itineraries" value={String(records.length)} />
        <Stat label="Photographs" value={formatBytes(bytes)} />
        <Stat label="Schema version" value={String(SCHEMA_VERSION)} />
      </dl>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleExport()}
          className="min-h-11 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark"
        >
          Export everything
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-11 rounded-full border border-stone-dark px-6 text-sm text-charcoal/75 transition-colors hover:border-forest hover:text-forest"
        >
          Import a file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const mode = window.confirm(
              "Replace everything currently stored?\n\nOK replaces all itineraries with the file's.\nCancel merges the file into what is already here."
            )
              ? "replace"
              : "merge";
            void handleImport(file, mode);
          }}
        />
      </div>

      {message && <p className="mt-5 text-sm text-forest">{message}</p>}
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <div className="mt-10 rounded-2xl border border-stone-dark bg-stone/25 p-5">
        <h3 className="font-utility text-xs uppercase tracking-wide text-forest">
          Moving to a different backend later
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-charcoal/65">
          Every itinerary carries a stable id, timestamps and a schema version, and all of the
          admin screens talk to the <code className="font-utility text-[13px]">ItineraryStore</code>{" "}
          interface rather than directly to Vercel Blob. Moving to a different store (Postgres, for
          example) means writing one more implementation of that interface and importing this
          export into it — the records go across unchanged, so nothing is lost and nothing has to
          be re-keyed.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone/40 px-4 py-3">
      <dt className="font-utility text-[10px] uppercase tracking-wide text-charcoal/50">{label}</dt>
      <dd className="mt-0.5 text-sm text-charcoal">{value}</dd>
    </div>
  );
}
