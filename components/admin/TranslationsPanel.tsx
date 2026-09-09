"use client";

import { useState } from "react";
import {
  TRANSLATION_LOCALES,
  translatableOf,
  type ItineraryRecord,
  type TranslationStatus,
} from "@/lib/itineraries/types";
import { cn } from "@/lib/utils/cn";
import { localeName } from "./ItineraryList";

/**
 * Turning English itineraries into the other four languages with Gemini.
 *
 * Gemini is not always available, and the point of this panel is that an
 * unavailable Gemini costs nothing: each locale's outcome is recorded against
 * the itinerary, a failure says why, and translating again later picks up
 * exactly the ones that are still missing. Until a locale is ready the wizard
 * shows that itinerary's English, so a failed translation is never a blank
 * page for a traveller.
 */
export function TranslationsPanel({
  records,
  onSave,
}: {
  records: ItineraryRecord[];
  onSave: (record: ItineraryRecord) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outstanding = records.filter((record) => pendingLocales(record).length > 0);

  async function translate(record: ItineraryRecord, locales: string[]) {
    setBusy(record.id);
    setError(null);

    const fields = translatableOf(record);
    const translations = { ...record.translations };

    for (const locale of locales) {
      try {
        const response = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ locale, fields }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          translations[locale] = {
            status: "failed",
            error: typeof data.error === "string" ? data.error : "Translation failed.",
          };
          continue;
        }

        translations[locale] = {
          status: "ready",
          fields: data.fields,
          translatedAt: new Date().toISOString(),
        };
      } catch {
        translations[locale] = {
          status: "failed",
          error: "Could not reach the server.",
        };
      }
    }

    try {
      await onSave({ ...record, translations });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the translations.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">Translations</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
        Itineraries are written in English and converted into the other four languages by
        Gemini. If Gemini is unavailable, the itinerary simply stays in English for those
        languages — come back and convert it when the service is up again.
      </p>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      {records.length > 0 && outstanding.length > 0 && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            for (const record of outstanding) {
              await translate(record, pendingLocales(record));
            }
          }}
          className="mt-6 min-h-11 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          {busy ? "Converting…" : `Convert everything outstanding (${outstanding.length})`}
        </button>
      )}

      {records.length === 0 ? (
        <p className="mt-10 text-sm text-charcoal/45">
          Nothing to translate yet — add an itinerary first.
        </p>
      ) : (
        <ul className="mt-7 space-y-3">
          {records.map((record) => {
            const missing = pendingLocales(record);
            return (
              <li
                key={record.id}
                className="rounded-2xl border border-stone-dark bg-warm-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h3 className="min-w-0 font-display text-lg leading-snug text-charcoal">
                    {record.head}
                  </h3>
                  <button
                    type="button"
                    disabled={busy !== null || missing.length === 0}
                    onClick={() => void translate(record, missing)}
                    className="min-h-9 shrink-0 rounded-full border border-stone-dark px-4 font-utility text-xs uppercase tracking-wide text-charcoal/70 transition-colors hover:border-forest hover:text-forest disabled:opacity-45"
                  >
                    {busy === record.id
                      ? "Converting…"
                      : missing.length === 0
                        ? "All languages ready"
                        : `Convert ${missing.length} language${missing.length === 1 ? "" : "s"}`}
                  </button>
                </div>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {TRANSLATION_LOCALES.map((locale) => {
                    const translation = record.translations[locale];
                    const status: TranslationStatus = translation?.status ?? "missing";
                    return (
                      <li
                        key={locale}
                        className="flex items-start justify-between gap-3 rounded-xl bg-stone/30 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-charcoal">{localeName(locale)}</p>
                          {status === "failed" && translation?.error && (
                            <p className="mt-0.5 text-xs leading-relaxed text-charcoal/50">
                              {translation.error}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={status} />
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Everything not already translated — the missing ones and the failed ones. */
function pendingLocales(record: ItineraryRecord) {
  return TRANSLATION_LOCALES.filter(
    (locale) => record.translations[locale]?.status !== "ready"
  ) as string[];
}

function StatusBadge({ status }: { status: TranslationStatus }) {
  const label =
    status === "ready" ? "Ready" : status === "failed" ? "Failed" : status === "pending" ? "Pending" : "Not yet";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 font-utility text-[10px] uppercase tracking-wide",
        status === "ready"
          ? "bg-forest text-warm-white"
          : status === "failed"
            ? "bg-clay/15 text-clay"
            : "bg-charcoal/10 text-charcoal/55"
      )}
    >
      {label}
    </span>
  );
}
