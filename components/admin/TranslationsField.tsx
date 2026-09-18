"use client";

import { useState } from "react";
import {
  TRANSLATION_LOCALES,
  translatableOf,
  type ItineraryRecord,
  type ItineraryTranslation,
  type TranslationStatus,
} from "@/lib/itineraries/types";
import { localeNames } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

/**
 * The four other languages, inside the itinerary editor.
 *
 * This used to be a section of its own, listing every itinerary and offering
 * to convert all of them at once. Two things were wrong with that. Translating
 * was somewhere other than where the text is written, so it was a separate
 * trip to make and easy not to make at all; and a run over every outstanding
 * itinerary times four languages is a long chain of calls to a service that
 * fails intermittently, where one bad response mid-way leaves you guessing
 * what actually landed.
 *
 * One language at a time, next to the English it comes from. Each button is
 * one call, its outcome lands on that language's row, and a failure costs
 * nothing but a second press.
 *
 * Translations belong to the English they were made from — see `stale`.
 */
export function TranslationsField({
  draft,
  /** The English `draft.translations` currently corresponds to, or `null`. */
  base,
  onTranslated,
}: {
  draft: ItineraryRecord;
  base: string | null;
  onTranslated: (locale: string, translation: ItineraryTranslation) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * Has the English moved on since these translations were made?
   *
   * If it has, they describe wording that no longer exists, and showing them
   * as "Ready" would be a lie that ends up on the public site. They are
   * treated as absent here and discarded on save.
   */
  const stale = englishOf(draft) !== base;

  const ready = stale
    ? 0
    : TRANSLATION_LOCALES.filter((l) => draft.translations[l]?.status === "ready").length;

  async function translate(locale: string) {
    setBusy(locale);
    try {
      const response = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ locale, fields: translatableOf(draft) }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        fields?: unknown;
        error?: unknown;
      };

      onTranslated(
        locale,
        response.ok
          ? {
              status: "ready",
              fields: data.fields as ItineraryTranslation["fields"],
              translatedAt: new Date().toISOString(),
            }
          : {
              status: "failed",
              error: typeof data.error === "string" ? data.error : "Translation failed.",
            },
      );
    } catch {
      onTranslated(locale, { status: "failed", error: "Could not reach the server." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-stone-dark bg-stone/30 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-lg text-charcoal">Other languages</h3>
        <span className="font-utility text-[11px] uppercase tracking-wide text-charcoal/40">
          {ready} of {TRANSLATION_LOCALES.length} ready
        </span>
      </div>

      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
        The English above, converted by Gemini. One language at a time — a
        language that fails costs nothing but another press, and the others are
        unaffected. Until a language is ready, travellers reading it see the
        English rather than blanks.
      </p>

      {stale && Object.keys(draft.translations).length > 0 && (
        <p className="mt-3 rounded-xl bg-clay/10 px-4 py-3 text-sm leading-relaxed text-charcoal">
          The English has changed since these were made, so they no longer match
          it and will be discarded when you save. Translate again after saving,
          or now.
        </p>
      )}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {TRANSLATION_LOCALES.map((locale) => {
          const translation = stale ? undefined : draft.translations[locale];
          const status: TranslationStatus = translation?.status ?? "missing";

          return (
            <li
              key={locale}
              className="flex items-center justify-between gap-3 rounded-xl bg-warm-white px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-charcoal">{localeNames[locale] ?? locale}</p>
                {status === "failed" && translation?.error && (
                  <p className="mt-0.5 text-xs leading-relaxed text-charcoal/50">
                    {translation.error}
                  </p>
                )}
                {status === "ready" && translation?.translatedAt && (
                  <p className="mt-0.5 text-xs text-charcoal/40">
                    {translation.translatedAt.slice(0, 10)}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={status} />
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void translate(locale)}
                  className="min-h-9 rounded-full border border-stone-dark px-3.5 font-utility text-[11px] uppercase tracking-wide text-charcoal/70 transition-colors hover:border-forest hover:text-forest disabled:opacity-45"
                >
                  {busy === locale ? "…" : status === "ready" ? "Redo" : "Translate"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The English a translation was made from, as one comparable string.
 *
 * Only the fields that actually get translated: moving an itinerary on the
 * map or changing how many days it takes does not make its Dutch wrong.
 */
export function englishOf(record: ItineraryRecord): string {
  return JSON.stringify(translatableOf(record));
}

function StatusBadge({ status }: { status: TranslationStatus }) {
  const label =
    status === "ready"
      ? "Ready"
      : status === "failed"
        ? "Failed"
        : status === "pending"
          ? "Pending"
          : "Not yet";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 font-utility text-[10px] uppercase tracking-wide",
        status === "ready"
          ? "bg-forest text-warm-white"
          : status === "failed"
            ? "bg-clay/15 text-clay"
            : "bg-charcoal/10 text-charcoal/55",
      )}
    >
      {label}
    </span>
  );
}
