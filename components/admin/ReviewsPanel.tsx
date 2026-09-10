"use client";

import { useCallback, useEffect, useState } from "react";
import type { Review } from "@/lib/reviews/types";
import type { TourRequest } from "@/lib/tourRequests/types";

/**
 * Enquiries, review invitations, and moderation — the three things that
 * only make sense next to each other.
 *
 * The team works down the enquiry list, and when a trip is finished they
 * ask that traveller for a review. The link is copied from here into
 * WhatsApp or an email by hand rather than sent automatically: the team
 * already talks to these people, and an unexpected automated mail would be
 * worse than a line in a conversation that is already happening.
 */
export function ReviewsPanel() {
  const [requests, setRequests] = useState<TourRequest[]>([]);
  const [pending, setPending] = useState<Review[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [queue, reviews] = await Promise.all([
        fetch("/api/admin/requests", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/admin/reviews?status=pending", {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      if (queue.status === 503 || reviews.status === 503) {
        setStatus("unavailable");
        return;
      }
      if (!queue.ok || !reviews.ok) throw new Error("load");

      setRequests((await queue.json()).requests ?? []);
      setPending((await reviews.json()).reviews ?? []);
      setStatus("ready");
    } catch {
      setError("Could not load enquiries and reviews.");
      setStatus("ready");
    }
  }, []);

  /* Fetching on mount. The rule cannot distinguish this from a cascading
     render, but the data lives on the server and there is nowhere earlier
     to ask for it — the admin page is a client island inside a server
     component that deliberately holds no enquiry data. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function invite(reference: string) {
    setError(null);
    try {
      const response = await fetch("/api/admin/reviews/invites", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      if (!response.ok) throw new Error("invite");
      const { invite: created } = await response.json();
      setLinks((current) => ({
        ...current,
        [reference]: `${window.location.origin}/${created.locale}/review/${created.token}`,
      }));
    } catch {
      setError("Could not create that invitation.");
    }
  }

  async function moderate(id: string, next: "approved" | "rejected") {
    setError(null);
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!response.ok) throw new Error("moderate");
      setPending((current) => current.filter((review) => review.id !== id));
    } catch {
      setError("Could not save that decision.");
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-charcoal/45">Loading…</p>;
  }

  if (status === "unavailable") {
    return (
      <p className="rounded-2xl border border-stone-dark bg-stone/20 p-5 text-sm leading-relaxed text-charcoal">
        Enquiries and reviews need Firebase. Set the Firebase variables and check
        <code className="mx-1 rounded bg-warm-white px-1.5 py-0.5">/api/admin/firebase-status</code>
        first.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {error && (
        <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <section>
        <h2 className="font-display text-2xl text-charcoal">Awaiting moderation</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">
          Nothing here is public until you approve it. Rejecting also deletes the
          photographs.
        </p>

        {pending.length === 0 ? (
          <p className="mt-5 text-sm text-charcoal/45">No reviews waiting.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {pending.map((review) => (
              <li
                key={review.id}
                className="rounded-2xl border border-stone-dark bg-warm-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-charcoal">
                    {review.author}
                    {review.country ? `, ${review.country}` : ""}
                  </p>
                  <p className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)} · {review.reference}
                  </p>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-charcoal/80">
                  {review.quote}
                </p>

                {review.photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {review.photos.map((photo) => (
                      /* Moderation means looking at the photographs too, not
                         just the words. */
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={photo.path}
                        src={photo.url}
                        alt=""
                        className="h-28 w-36 rounded-xl border border-stone-dark object-cover"
                      />
                    ))}
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => void moderate(review.id, "approved")}
                    className="min-h-10 rounded-full bg-forest px-5 text-sm font-medium text-warm-white hover:bg-forest-dark"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => void moderate(review.id, "rejected")}
                    className="min-h-10 rounded-full border border-stone-dark px-5 text-sm font-medium text-charcoal hover:border-clay"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl text-charcoal">Enquiries</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">
          Every custom tour sent from the site. Ask for a review once the trip has
          happened.
        </p>

        {requests.length === 0 ? (
          <p className="mt-5 text-sm text-charcoal/45">No enquiries yet.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {requests.map((request) => (
              <li
                key={request.reference}
                className="rounded-2xl border border-stone-dark bg-warm-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-charcoal">
                    {request.payload.name} · {request.reference}
                  </p>
                  <p className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                    {new Date(request.createdAt).toLocaleDateString("en-GB")} ·{" "}
                    {request.status}
                  </p>
                </div>
                <p className="mt-1 text-sm text-charcoal/60">
                  {request.payload.travelers} travelling ·{" "}
                  {request.payload.dateRange.start ?? "dates unset"} → {request.payload.dateRange.end ?? "-"}
                </p>
                <p className="mt-1 text-sm text-charcoal/60">{request.email}</p>

                {links[request.reference] ? (
                  <div className="mt-4">
                    <p className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                      Send this link
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <input
                        readOnly
                        value={links[request.reference]}
                        onFocus={(event) => event.target.select()}
                        className="min-h-10 min-w-0 flex-1 rounded-xl border border-stone-dark bg-stone/20 px-3 text-xs text-charcoal"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(links[request.reference])
                        }
                        className="min-h-10 rounded-full border border-forest px-4 text-sm font-medium text-forest hover:bg-forest hover:text-warm-white"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-charcoal/50">
                      Works once, expires in 60 days.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void invite(request.reference)}
                    className="mt-4 min-h-10 rounded-full border border-forest px-5 text-sm font-medium text-forest hover:bg-forest hover:text-warm-white"
                  >
                    Request a review
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
