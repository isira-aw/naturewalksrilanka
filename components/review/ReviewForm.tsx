"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { fileToDataUrl } from "@/lib/itineraries/imageFile";
import { MAX_REVIEW_PHOTOS } from "@/lib/reviews/types";

/**
 * Leaving a review, for someone the team invited.
 *
 * The photographs are resized in the browser before they are sent — the
 * same canvas pass the admin form uses — because a phone camera original is
 * several megabytes and the server would reject it. That resize is a
 * convenience, not a control: the real limits are enforced again on the
 * server, which is the only place a limit means anything.
 */
export function ReviewForm({ token, name }: { token: string; name: string }) {
  const t = useTranslations("review");
  const [author, setAuthor] = useState(name);
  const [country, setCountry] = useState("");
  const [rating, setRating] = useState(0);
  const [quote, setQuote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_REVIEW_PHOTOS - photos.length;
    if (room <= 0) {
      setError(t("tooManyPhotos", { max: MAX_REVIEW_PHOTOS }));
      return;
    }
    try {
      const added = await Promise.all(
        Array.from(files)
          .slice(0, room)
          .map((file) => fileToDataUrl(file)),
      );
      setPhotos((current) => [...current, ...added]);
    } catch {
      setError(t("photoUnreadable"));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (rating === 0) return setError(t("errorRating"));
    if (!author.trim()) return setError(t("errorName"));
    if (!quote.trim()) return setError(t("errorQuote"));

    setBusy(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, author, country, rating, quote, photos }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(messageFor(body.error, t));
        return;
      }
      setDone(true);
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-dark bg-stone/20 p-6 text-center sm:p-8">
        <h1 className="font-display text-2xl text-charcoal">{t("thanksTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal/60">{t("thanksBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-charcoal">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/60">{t("intro")}</p>

      <fieldset className="mt-8">
        <legend className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
          {t("ratingLabel")}
        </legend>
        <div className="mt-2 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={t("ratingOf", { value })}
              aria-pressed={rating === value}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg transition-colors ${
                value <= rating
                  ? "border-forest bg-forest text-warm-white"
                  : "border-stone-dark bg-warm-white text-charcoal/35 hover:border-forest"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
          {t("nameLabel")}
        </span>
        <input
          type="text"
          required
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
        />
      </label>

      <label className="mt-4 block">
        <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
          {t("countryLabel")}
        </span>
        <input
          type="text"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
        />
      </label>

      <label className="mt-4 block">
        <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
          {t("quoteLabel")}
        </span>
        <textarea
          required
          rows={6}
          maxLength={4000}
          value={quote}
          onChange={(event) => setQuote(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 py-3 text-sm leading-relaxed text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
        />
      </label>

      <section className="mt-6">
        <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
          {t("photosLabel")}
        </span>
        <p className="mt-1 text-xs leading-relaxed text-charcoal/50">
          {t("photosHint", { max: MAX_REVIEW_PHOTOS })}
        </p>

        {photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {photos.map((src, index) => (
              <figure
                key={index}
                className="relative h-24 w-32 overflow-hidden rounded-xl border border-stone-dark bg-stone"
              >
                {/* A data URL held only until submit — next/image cannot help. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                  aria-label={t("removePhoto")}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-charcoal/70 text-warm-white"
                >
                  ×
                </button>
              </figure>
            ))}
          </div>
        )}

        {photos.length < MAX_REVIEW_PHOTOS && (
          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-forest px-5 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-warm-white">
            {t("addPhotos")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                void addPhotos(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={busy} className="mt-8 w-full">
        {busy ? t("sending") : t("submit")}
      </Button>

      <p className="mt-4 text-xs leading-relaxed text-charcoal/50">{t("moderationNote")}</p>
    </form>
  );
}

/** Server error codes are deliberate and specific; say which rule was broken. */
function messageFor(code: unknown, t: (key: string) => string) {
  switch (code) {
    case "token_spent":
      return t("errorSpent");
    case "invalid_token":
      return t("errorInvalid");
    case "photo_too_large":
      return t("errorPhotoLarge");
    case "photo_type_not_allowed":
    case "photo_not_an_image":
      return t("errorPhotoType");
    default:
      return t("errorGeneric");
  }
}
