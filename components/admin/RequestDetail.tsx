"use client";

import { useCallback, useEffect, useState } from "react";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { useItineraries } from "@/lib/itineraries/useItineraries";
import { downloadJourneyDocument } from "@/lib/journey-document";
import {
  documentFromRequest,
  type RebuiltDocument,
  type UiMessages,
} from "@/lib/journey-document/fromRequest";
import {
  REQUEST_STATUSES,
  type RequestRevision,
  type RequestStatus,
  type TourRequest,
} from "@/lib/tourRequests/types";

/**
 * One enquiry in full, and the traveller's document rebuilt from it.
 *
 * The document is the reason this view exists. A traveller's PDF used to live
 * only in their own browser: once they closed the tab there was no copy, so
 * the team could not reprint it, could not send it on, and could not open it
 * in Word to edit a quote around it. Now it can be produced again from here,
 * in their language or in English.
 *
 * Rendering happens in this browser, not on the server, so the file is
 * produced by exactly the code that produced theirs — there is no second
 * renderer that could quietly drift from the first.
 */

const STATUS_LABELS: Record<RequestStatus, string> = {
  received: "Received",
  "in-progress": "In progress",
  quoted: "Quoted",
  confirmed: "Confirmed",
  closed: "Closed",
};

type Loaded = { request: TourRequest; revisions: RequestRevision[] };

export function RequestDetail({
  reference,
  onBack,
  onStatusChanged,
}: {
  reference: string;
  onBack: () => void;
  onStatusChanged: (request: TourRequest) => void;
}) {
  const { records, loaded: recordsLoaded } = useItineraries();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [documentLocale, setDocumentLocale] = useState<Locale | null>(null);
  const [building, setBuilding] = useState<"pdf" | "doc" | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [lastBuild, setLastBuild] = useState<RebuiltDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/requests/${encodeURIComponent(reference)}`,
          { credentials: "same-origin", cache: "no-store" },
        );
        if (cancelled) return;
        if (!response.ok) {
          setError(
            response.status === 404
              ? "That enquiry no longer exists."
              : "Could not load that enquiry.",
          );
          return;
        }
        const loaded = (await response.json()) as Loaded;
        if (cancelled) return;
        setData(loaded);
        /* Default to the language the traveller was reading, so the first
           download is their document rather than a translation of it. */
        setDocumentLocale(
          (locales as readonly string[]).includes(loaded.request.locale)
            ? (loaded.request.locale as Locale)
            : "en",
        );
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const changeStatus = useCallback(
    async (status: RequestStatus) => {
      setSaving(true);
      try {
        const response = await fetch(
          `/api/admin/requests/${encodeURIComponent(reference)}`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        if (!response.ok) {
          setError("Could not save that status.");
          return;
        }
        const { request } = (await response.json()) as { request: TourRequest };
        setData((current) => (current ? { ...current, request } : current));
        onStatusChanged(request);
      } catch {
        setError("Could not reach the server.");
      } finally {
        setSaving(false);
      }
    },
    [reference, onStatusChanged],
  );

  const download = useCallback(
    async (kind: "pdf" | "doc") => {
      if (!data || !documentLocale) return;
      setBuilding(kind);
      setBuildError(null);
      try {
        /* Only the one language's strings are fetched, and only when a
           document is actually asked for — the panel itself runs in English
           and has no reason to carry five locales of messages. */
        const [messages, navigation] = await Promise.all([
          import(`@/content/${documentLocale}/ui.json`),
          /* The number comes from the content files, like everywhere else on
             the site. Copying it into a constant here would be a second place
             for it to be right, and eventually one place for it to be wrong. */
          import(`@/content/${documentLocale}/navigation.json`),
        ]);

        const built = documentFromRequest({
          request: data.request,
          records,
          locale: documentLocale,
          messages: messages.default as UiMessages,
          whatsappNumber: navigation.default.contact.whatsappNumber,
        });
        setLastBuild(built);
        await downloadJourneyDocument(built.document, kind);
      } catch (caught) {
        console.error("Could not rebuild the journey document", caught);
        setBuildError(
          "Could not build that document. The map service may be unreachable — try again shortly.",
        );
      } finally {
        setBuilding(null);
      }
    },
    [data, documentLocale, records],
  );

  if (error) {
    return (
      <div>
        <BackButton onBack={onBack} />
        <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      </div>
    );
  }

  if (!data || !documentLocale) {
    return (
      <div>
        <BackButton onBack={onBack} />
        <p className="mt-6 text-sm text-charcoal/45">Loading…</p>
      </div>
    );
  }

  const { request, revisions } = data;
  const { payload } = request;

  return (
    <div>
      <BackButton onBack={onBack} />

      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="font-display text-2xl text-charcoal">{payload.name}</h2>
        <span className="font-utility text-xs uppercase tracking-wide text-forest">
          {request.reference}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-charcoal/55">
        Sent {request.createdAt.slice(0, 10)} in{" "}
        {localeNames[documentLocale] ?? request.locale}
        {request.revision > 0 && ` · amended ${request.revision}×`}
      </p>

      {/* ---- the document ------------------------------------------------ */}
      <section className="mt-8 rounded-2xl border border-stone-dark bg-stone/30 p-5">
        <h3 className="font-display text-lg text-charcoal">Journey document</h3>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
          The same PDF and Word file the traveller was offered. The Word copy
          opens in Microsoft Word with its layout intact, so a quote can be
          built around it.
        </p>

        {request.downloads.length > 0 && (
          <p className="mt-3 text-sm text-charcoal/55">
            They saved{" "}
            {request.downloads
              .map((entry) => `${entry.kind === "pdf" ? "the PDF" : "the Word file"} on ${entry.at.slice(0, 10)}`)
              .join(", ")}
            .
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="document-locale">
            Document language
          </label>
          <select
            id="document-locale"
            value={documentLocale}
            onChange={(event) => {
              setDocumentLocale(event.target.value as Locale);
              setLastBuild(null);
            }}
            className="min-h-10 rounded-full border border-stone-dark bg-warm-white px-4 text-sm text-charcoal"
          >
            {locales.map((entry) => (
              <option key={entry} value={entry}>
                {localeNames[entry]}
                {entry === request.locale ? " — as they saw it" : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void download("pdf")}
            disabled={building !== null || !recordsLoaded}
            className="min-h-10 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
          >
            {building === "pdf" ? "Building…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => void download("doc")}
            disabled={building !== null || !recordsLoaded}
            className="min-h-10 rounded-full border border-stone-dark px-6 text-sm text-charcoal/70 transition-colors hover:border-forest hover:text-forest disabled:opacity-60"
          >
            {building === "doc" ? "Building…" : "Download Word"}
          </button>
        </div>

        {buildError && (
          <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
            {buildError}
          </p>
        )}

        {/* Whether this is their file or a reconstruction is not a detail —
            a rebuilt document can differ from the one they are holding. */}
        {lastBuild && <Provenance built={lastBuild} />}
      </section>

      {/* ---- status ------------------------------------------------------ */}
      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">Status</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {REQUEST_STATUSES.map((entry) => (
            <button
              key={entry}
              type="button"
              disabled={saving || entry === request.status}
              onClick={() => void changeStatus(entry)}
              aria-pressed={entry === request.status}
              className={
                entry === request.status
                  ? "min-h-10 rounded-full bg-forest px-5 text-sm text-warm-white"
                  : "min-h-10 rounded-full border border-stone-dark px-5 text-sm text-charcoal/70 transition-colors hover:border-forest hover:text-forest disabled:opacity-60"
              }
            >
              {STATUS_LABELS[entry]}
            </button>
          ))}
        </div>
      </section>

      {/* ---- what they asked for ----------------------------------------- */}
      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">What they asked for</h3>
        <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Row label="Email" value={request.email} />
          <Row label="Phone" value={payload.phone} />
          <Row label="Country" value={payload.country || "—"} />
          <Row label="Travellers" value={String(payload.travelers)} />
          <Row
            label="Dates"
            value={
              payload.dateRange.start && payload.dateRange.end
                ? `${payload.dateRange.start} → ${payload.dateRange.end}`
                : "Not given"
            }
          />
          <Row label="Interests" value={payload.interests.join(", ") || "—"} />
          <Row label="Accommodation" value={payload.accommodation.join(", ") || "—"} />
          <Row label="Itineraries chosen" value={String(payload.selectedExperiences.length)} />
        </dl>

        {payload.accommodationNotes.trim() && (
          <Block label="Accommodation notes" value={payload.accommodationNotes} />
        )}
        {payload.requirements.trim() && (
          <Block label="Requirements" value={payload.requirements} />
        )}

        <ul className="mt-4 flex flex-wrap gap-2">
          {payload.selectedExperiences.map((slug) => {
            const known = records.some((record) => record.slug === slug);
            return (
              <li
                key={slug}
                className={
                  known
                    ? "rounded-full bg-forest/10 px-3 py-1 text-xs text-forest"
                    : "rounded-full bg-clay/15 px-3 py-1 text-xs text-charcoal/60"
                }
                title={known ? undefined : "This itinerary no longer exists"}
              >
                {slug}
                {!known && " · removed"}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- history ----------------------------------------------------- */}
      {revisions.length > 0 && (
        <section className="mt-8">
          <h3 className="font-display text-lg text-charcoal">Earlier versions</h3>
          <p className="mt-1.5 text-sm text-charcoal/55">
            Kept because the team may have quoted against a version the
            traveller has since replaced.
          </p>
          <ul className="mt-3 divide-y divide-stone-dark border-y border-stone-dark">
            {revisions.map((entry) => (
              <li key={entry.revision} className="flex flex-wrap gap-x-4 gap-y-1 py-3 text-sm">
                <span className="font-utility text-xs uppercase tracking-wide text-charcoal/40">
                  rev {entry.revision}
                </span>
                <span className="text-charcoal/70">
                  {entry.payload.travelers} travelling,{" "}
                  {entry.payload.selectedExperiences.length} itineraries
                </span>
                <span className="ml-auto text-xs tabular-nums text-charcoal/40">
                  replaced {entry.supersededAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Says where the document just built came from.
 *
 * A snapshot is the traveller's own file. A rebuild is assembled from today's
 * itineraries, so if one has been edited or deleted since, what the team is
 * holding is not quite what the traveller is holding — and sending it out
 * without knowing that is exactly the mistake worth preventing.
 */
function Provenance({ built }: { built: RebuiltDocument }) {
  if (built.source === "snapshot") {
    return (
      <p className="mt-4 text-sm leading-relaxed text-charcoal/55">
        This is the traveller&rsquo;s own document, saved when they sent the
        enquiry.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-warm-white px-4 py-3 text-sm leading-relaxed text-charcoal/70">
      <p>
        Rebuilt from the enquiry, using the itineraries as they stand today.
        This enquiry was sent before documents were saved alongside them.
      </p>
      {built.missingSlugs.length > 0 && (
        <p className="mt-2">
          <strong className="font-medium text-charcoal">
            {built.missingSlugs.length} itinerar
            {built.missingSlugs.length === 1 ? "y has" : "ies have"} since been
            deleted
          </strong>{" "}
          and {built.missingSlugs.length === 1 ? "is" : "are"} missing from it:{" "}
          {built.missingSlugs.join(", ")}.
        </p>
      )}
      {built.changedSlugs.length > 0 && (
        <p className="mt-2">
          Edited since this enquiry came in, so the wording may differ from
          their copy: {built.changedSlugs.join(", ")}.
        </p>
      )}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="font-utility text-xs uppercase tracking-wide text-charcoal/50 transition-colors hover:text-forest"
    >
      &larr; All customers
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-utility text-[11px] uppercase tracking-wide text-charcoal/40">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-charcoal">{value}</dd>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="font-utility text-[11px] uppercase tracking-wide text-charcoal/40">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-charcoal/80">
        {value}
      </p>
    </div>
  );
}
