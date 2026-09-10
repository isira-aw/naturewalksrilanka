"use client";

import { useState } from "react";
import { ITINERARY_CATEGORIES } from "@/lib/itineraries/categories";
import { PROVINCES } from "@/lib/geo/sriLanka";
import {
  emptyRecord,
  uniqueSlug,
  type ItineraryHighlight,
  type ItineraryRecord,
} from "@/lib/itineraries/types";
import {
  ACCEPTED_IMAGE_TYPES,
  approximateBytes,
  formatBytes,
} from "@/lib/itineraries/imageFile";
import { isInlineImage, prepareItineraryImage } from "@/lib/itineraries/imageUpload";
import { Field, Label, TextArea, TextInput } from "./controls";

const MAX_IMAGES = 3;

/**
 * Add or edit one itinerary.
 *
 * English only, by design: this is the source text, and the other four locales
 * are produced from it by Gemini afterwards (the Translations panel). Editing
 * an itinerary's English resets its translations, because a translation of
 * superseded text is worse than no translation at all.
 */
export function ItineraryForm({
  initial,
  existing,
  onSave,
  onCancel,
}: {
  initial?: ItineraryRecord;
  existing: ItineraryRecord[];
  onSave: (record: ItineraryRecord) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ItineraryRecord>(() => initial ?? emptyRecord());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEdit = Boolean(initial);

  function patch(changes: Partial<ItineraryRecord>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function patchHighlight(index: number, changes: Partial<ItineraryHighlight>) {
    setDraft((current) => ({
      ...current,
      highlights: current.highlights.map((highlight, i) =>
        i === index ? { ...highlight, ...changes } : highlight
      ),
    }));
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_IMAGES - draft.images.length;
    if (room <= 0) {
      setError(`An itinerary holds at most ${MAX_IMAGES} photographs.`);
      return;
    }
    try {
      const added = await Promise.all(
        Array.from(files)
          .slice(0, room)
          .map((file, offset) =>
            prepareItineraryImage(file, draft.id, `image-${draft.images.length + offset}`)
          )
      );
      setDraft((current) => ({ ...current, images: [...current.images, ...added] }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That photograph could not be read.");
    }
  }

  async function addHighlightImage(index: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    try {
      patchHighlight(index, {
        image: await prepareItineraryImage(file, draft.id, `highlight-${index}`),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That photograph could not be read.");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!draft.head.trim()) return setError("Give the itinerary a heading.");
    if (!draft.content1.trim()) return setError("Content 1 is required.");
    if (draft.images.length === 0) return setError("Add at least one photograph.");
    if (draft.highlights.some((highlight) => !highlight.name.trim())) {
      return setError("Every “what you might see” entry needs a name.");
    }

    /* Changing the English invalidates whatever was translated from it, so the
       translations go back to "missing" and the Translations panel asks for
       them again — rather than leaving four locales quietly showing the old
       wording. */
    const englishChanged =
      !initial ||
      initial.head !== draft.head ||
      initial.content1 !== draft.content1 ||
      initial.content2 !== draft.content2 ||
      initial.bestTime !== draft.bestTime ||
      initial.suggestedLength !== draft.suggestedLength ||
      JSON.stringify(initial.highlights.map((h) => [h.name, h.description])) !==
        JSON.stringify(draft.highlights.map((h) => [h.name, h.description]));

    const record: ItineraryRecord = {
      ...draft,
      head: draft.head.trim(),
      slug: uniqueSlug(draft.head, existing, draft.id),
      highlights: draft.highlights
        .filter((highlight) => highlight.name.trim())
        .map((highlight) => ({
          name: highlight.name.trim(),
          description: highlight.description?.trim() || undefined,
          image: highlight.image,
        })),
      translations: englishChanged ? {} : draft.translations,
    };

    setBusy(true);
    try {
      await onSave(record);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  /* Only images still held inline cost anything here — one uploaded to
     Storage is a short URL, so counting it would report a size the record
     does not actually carry. */
  const totalBytes =
    draft.images.reduce((sum, src) => sum + (isInlineImage(src) ? approximateBytes(src) : 0), 0) +
    draft.highlights.reduce(
      (sum, highlight) =>
        sum + (isInlineImage(highlight.image) ? approximateBytes(highlight.image!) : 0),
      0
    );

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <h2 className="font-display text-2xl text-charcoal">
        {isEdit ? "Edit itinerary" : "Add itinerary"}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">
        Write it in English. Other languages are produced from this text afterwards, in
        Translations.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Category" required>
          <select
            value={draft.category}
            onChange={(event) =>
              patch({ category: event.target.value as ItineraryRecord["category"] })
            }
            className="min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
          >
            {ITINERARY_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Province" required>
          <select
            value={draft.province}
            onChange={(event) =>
              patch({ province: event.target.value as ItineraryRecord["province"] })
            }
            className="min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
          >
            {PROVINCES.map((province) => (
              <option key={province.id} value={province.id}>
                {province.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Head" required className="mt-5">
        <TextInput
          value={draft.head}
          onChange={(value) => patch({ head: value })}
          placeholder="Sinharaja endemic mornings"
        />
      </Field>

      {/* ---- photographs ---- */}

      <section className="mt-8">
        <Label>Photographs</Label>
        <p className="mt-1 text-xs leading-relaxed text-charcoal/50">
          Two or three. Stored with the itinerary as base64, resized on the way in.
        </p>

        <div className="mt-3 flex flex-wrap gap-3">
          {draft.images.map((src, index) => (
            <figure
              key={index}
              className="relative h-28 w-40 overflow-hidden rounded-xl border border-stone-dark bg-stone"
            >
              {/* A data URL, so a plain img — next/image has nothing to optimise. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() =>
                  patch({ images: draft.images.filter((_, i) => i !== index) })
                }
                aria-label={`Remove photograph ${index + 1}`}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-charcoal/70 text-warm-white transition-colors hover:bg-charcoal"
              >
                <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
                </svg>
              </button>
            </figure>
          ))}

          {draft.images.length < MAX_IMAGES && (
            <label className="flex h-28 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-dark text-xs text-charcoal/55 transition-colors hover:border-forest hover:text-forest">
              <span className="text-lg leading-none">+</span>
              Add photograph
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                multiple
                className="sr-only"
                onChange={(event) => {
                  void addImages(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="Best time of year" hint="optional">
          <TextInput
            value={draft.bestTime ?? ""}
            onChange={(value) => patch({ bestTime: value || undefined })}
            placeholder="December – April"
          />
        </Field>
        <Field label="Suggested length" hint="optional">
          <TextInput
            value={draft.suggestedLength ?? ""}
            onChange={(value) => patch({ suggestedLength: value || undefined })}
            placeholder="2–3 days"
          />
        </Field>
      </div>

      <Field label="Content 1" required className="mt-5">
        <TextArea
          value={draft.content1}
          onChange={(value) => patch({ content1: value })}
          rows={6}
          placeholder="What this itinerary is, and why someone would choose it."
        />
      </Field>

      <Field label="Content 2" hint="optional" className="mt-5">
        <TextArea
          value={draft.content2 ?? ""}
          onChange={(value) => patch({ content2: value || undefined })}
          rows={5}
          placeholder="A second paragraph, if the first is not enough."
        />
      </Field>

      {/* ---- what you might see ---- */}

      <section className="mt-8">
        <Label>What you might see</Label>
        <p className="mt-1 text-xs leading-relaxed text-charcoal/50">
          One entry per sight or species. The name is required; the description and the
          photograph are not.
        </p>

        <ul className="mt-3 space-y-3">
          {draft.highlights.map((highlight, index) => (
            <li
              key={index}
              className="rounded-xl border border-stone-dark bg-stone/25 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <TextInput
                    value={highlight.name}
                    onChange={(value) => patchHighlight(index, { name: value })}
                    placeholder="Sigiriya Lion Rock"
                  />
                  <TextInput
                    value={highlight.description ?? ""}
                    onChange={(value) =>
                      patchHighlight(index, { description: value || undefined })
                    }
                    placeholder="Start at opening, before the heat"
                  />
                </div>

                <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-dark text-center text-[10px] leading-tight text-charcoal/50 transition-colors hover:border-forest hover:text-forest">
                  {highlight.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={highlight.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-1">Add photo</span>
                  )}
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    className="sr-only"
                    onChange={(event) => {
                      void addHighlightImage(index, event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    patch({ highlights: draft.highlights.filter((_, i) => i !== index) })
                  }
                  aria-label={`Remove entry ${index + 1}`}
                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal/45 transition-colors hover:bg-stone hover:text-charcoal"
                >
                  <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {highlight.image && (
                <button
                  type="button"
                  onClick={() => patchHighlight(index, { image: undefined })}
                  className="mt-2 font-utility text-[11px] uppercase tracking-wide text-charcoal/45 underline underline-offset-4 hover:text-forest"
                >
                  Remove photograph
                </button>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() =>
            patch({ highlights: [...draft.highlights, { name: "" }] })
          }
          className="mt-3 min-h-10 rounded-full border border-stone-dark px-5 text-sm text-charcoal/75 transition-colors hover:border-forest hover:text-forest"
        >
          Add an entry
        </button>
      </section>

      {totalBytes > 0 && (
        <p className="mt-6 font-utility text-[11px] uppercase tracking-wide text-charcoal/40">
          Photographs on this itinerary: {formatBytes(totalBytes)}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-stone-dark pt-6">
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-full bg-forest px-7 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Save itinerary"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-stone-dark px-6 text-sm text-charcoal/75 transition-colors hover:border-forest hover:text-forest"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
