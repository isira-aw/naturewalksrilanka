"use client";

import { useEffect, useState } from "react";
import { REQUEST_STATUSES, type TourRequest } from "@/lib/tourRequests/types";
import { cn } from "@/lib/utils/cn";
import { RequestDetail } from "./RequestDetail";

/**
 * Every custom tour enquiry, and what became of it.
 *
 * The panel lost its view of this collection when the old Enquiries queue was
 * removed, which left the team with no way to look up what a traveller had
 * asked for — or to get back the document they downloaded. That is what this
 * section is for; the document rebuild lives in `RequestDetail`.
 *
 * Paged rather than listed in full. The endpoint this replaces read the whole
 * collection on every load.
 */
const STATUS_LABELS: Record<(typeof REQUEST_STATUSES)[number], string> = {
  received: "Received",
  "in-progress": "In progress",
  quoted: "Quoted",
  confirmed: "Confirmed",
  closed: "Closed",
};

export function CustomersPanel() {
  const [requests, setRequests] = useState<TourRequest[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [status, setStatus] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  /* Paging is driven by this rather than by calling a loader: the fetch has
     to happen in an effect, and setting state synchronously inside one is the
     cascading-render pattern React warns about. Setting the token is the
     event handler's whole job; the effect does the rest, after its await. */
  const [loadMoreToken, setLoadMoreToken] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const page = await fetchPage({ status, cursor: loadMoreToken });
      if (cancelled) return;

      if ("error" in page) {
        setError(page.error);
        setLoading(false);
        return;
      }

      setError(null);
      /* Appended when paging, replaced when the filter changed — otherwise
         switching status would show the new page under the old one. */
      setRequests((current) =>
        loadMoreToken ? [...current, ...page.requests] : page.requests,
      );
      setCursor(page.nextCursor);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, loadMoreToken]);

  /* Filtered in the browser, over the pages already fetched. Firestore cannot
     do a substring match, and a real search across the whole collection would
     mean a search index — which is not worth it for a list this size. The
     placeholder says so, rather than letting it look like a full search. */
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? requests.filter((entry) =>
        [entry.reference, entry.email, entry.payload.name, entry.payload.country]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : requests;

  if (open) {
    return (
      <RequestDetail
        reference={open}
        onBack={() => setOpen(null)}
        onStatusChanged={(updated) =>
          setRequests((current) =>
            current.map((entry) =>
              entry.reference === updated.reference ? updated : entry,
            ),
          )
        }
      />
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">Customers</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
        Every custom tour enquiry, newest first. Open one to see what the
        traveller chose, how it has changed since, and to download the journey
        document they were given.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="customer-search">
          Search loaded enquiries
        </label>
        <input
          id="customer-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter loaded enquiries by reference, name or email"
          className="min-h-10 min-w-0 flex-1 rounded-full border border-stone-dark bg-warm-white px-4 text-sm text-charcoal placeholder:text-charcoal/35"
        />
        <label className="sr-only" htmlFor="customer-status">
          Status
        </label>
        <select
          id="customer-status"
          value={status}
          onChange={(event) => {
            setLoading(true);
            setLoadMoreToken(undefined);
            setStatus(event.target.value);
          }}
          className="min-h-10 rounded-full border border-stone-dark bg-warm-white px-4 text-sm text-charcoal"
        >
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {STATUS_LABELS[entry]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      {!error && shown.length === 0 && !loading && (
        <p className="mt-10 max-w-lg rounded-2xl border border-dashed border-stone-dark px-6 py-10 text-center text-sm leading-relaxed text-charcoal/50">
          {requests.length === 0
            ? "No enquiries yet. They appear here the moment a traveller sends one from the custom-tour wizard."
            : "Nothing loaded so far matches that. Load more pages, or clear the filter."}
        </p>
      )}

      {shown.length > 0 && (
        <ul className="mt-6 divide-y divide-stone-dark border-y border-stone-dark">
          {shown.map((entry) => (
            <li key={entry.reference}>
              <button
                type="button"
                onClick={() => setOpen(entry.reference)}
                className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 px-1 py-4 text-left transition-colors hover:bg-stone/40"
              >
                <span className="font-utility text-xs uppercase tracking-wide text-forest">
                  {entry.reference}
                </span>
                <span className="text-sm text-charcoal">{entry.payload.name}</span>
                <span className="text-sm text-charcoal/45">{entry.email}</span>
                <span className="ml-auto flex items-center gap-3">
                  {entry.downloads.length > 0 && (
                    <span
                      className="font-utility text-[11px] uppercase tracking-wide text-charcoal/40"
                      title={`${entry.downloads.length} download${entry.downloads.length === 1 ? "" : "s"}`}
                    >
                      {entry.downloads.length}&times; saved
                    </span>
                  )}
                  {entry.revision > 0 && (
                    <span className="font-utility text-[11px] uppercase tracking-wide text-charcoal/40">
                      rev {entry.revision}
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 font-utility text-[11px] uppercase tracking-wide",
                      entry.status === "closed"
                        ? "bg-stone text-charcoal/50"
                        : "bg-forest/10 text-forest",
                    )}
                  >
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <span className="text-xs tabular-nums text-charcoal/40">
                    {entry.createdAt.slice(0, 10)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="mt-6 text-sm text-charcoal/45">Loading…</p>}

      {cursor && !loading && (
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setLoadMoreToken(cursor);
          }}
          className="mt-6 min-h-10 rounded-full border border-stone-dark px-5 text-sm text-charcoal/70 transition-colors hover:border-forest hover:text-forest"
        >
          Load more
        </button>
      )}
    </div>
  );
}

type Page = { requests: TourRequest[]; nextCursor?: string };

/**
 * One page of enquiries, or why there is not one.
 *
 * Deliberately sets no React state — it returns a result and the effect that
 * called it decides what to do, after the await.
 */
async function fetchPage({
  status,
  cursor,
}: {
  status: string;
  cursor?: string;
}): Promise<Page | { error: string }> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);

  try {
    const response = await fetch(`/api/admin/requests?${params}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        error:
          response.status === 503
            ? "Firebase is not reachable, so enquiries cannot be listed."
            : "Could not load enquiries.",
      };
    }
    return (await response.json()) as Page;
  } catch {
    return { error: "Could not reach the server." };
  }
}
