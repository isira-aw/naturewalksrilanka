"use client";

import { useCallback, useEffect, useState } from "react";
import { localeNames, locales, routing, type Locale } from "@/i18n/routing";
import type { Review, ReviewInvite } from "@/lib/reviews/types";

/**
 * Review links, moderation, and what is live — the three things that only
 * make sense next to each other.
 *
 * Links are made here and copied into WhatsApp or an email by hand rather
 * than sent automatically: the team already talks to these people, and an
 * unexpected automated mail would be worse than a line in a conversation
 * that is already happening. A link is tied to nobody, because plenty of
 * travellers never filled the enquiry form in and their reviews are worth
 * just as much.
 */
export function ReviewsPanel() {
  const [pending, setPending] = useState<Review[]>([]);
  const [published, setPublished] = useState<Review[]>([]);
  const [invites, setInvites] = useState<ReviewInvite[]>([]);
  const [label, setLabel] = useState("");
  const [locale, setLocale] = useState<Locale>(routing.defaultLocale);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [error, setError] = useState<string | null>(null);

  /* Both lists are paged. The first page arrives with everything else; these
     hold the cursor for the next one, and are absent when there is none. */
  const [pendingCursor, setPendingCursor] = useState<string | undefined>();
  const [publishedCursor, setPublishedCursor] = useState<string | undefined>();
  const [extending, setExtending] = useState<"pending" | "approved" | null>(null);

  const load = useCallback(async () => {
    try {
      const [waiting, live, sent] = await Promise.all([
        fetch("/api/admin/reviews?status=pending", {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/admin/reviews?status=approved", {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/admin/reviews/invites", { credentials: "same-origin", cache: "no-store" }),
      ]);

      if ([waiting, live, sent].some((response) => response.status === 503)) {
        setStatus("unavailable");
        return;
      }
      if (![waiting, live, sent].every((response) => response.ok)) throw new Error("load");

      const waitingPage = await waiting.json();
      const livePage = await live.json();

      setPending(waitingPage.reviews ?? []);
      setPendingCursor(waitingPage.nextCursor);
      setPublished(livePage.reviews ?? []);
      setPublishedCursor(livePage.nextCursor);
      setInvites((await sent.json()).invites ?? []);
      setStatus("ready");
    } catch {
      setError("Could not load the reviews.");
      setStatus("ready");
    }
  }, []);

  /* Fetching on mount. The rule cannot distinguish this from a cascading
     render, but the data lives on the server and there is nowhere earlier
     to ask for it — the admin page is a client island inside a server
     component that deliberately holds no review data. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * The next page of one of the two lists.
   *
   * Appends rather than replaces, and leaves the other list alone — they are
   * separate queries with separate cursors, and moderating from one while the
   * other is half-loaded should not disturb it.
   */
  async function loadMore(which: "pending" | "approved") {
    const cursor = which === "pending" ? pendingCursor : publishedCursor;
    if (!cursor) return;

    setExtending(which);
    try {
      const response = await fetch(
        `/api/admin/reviews?status=${which}&cursor=${encodeURIComponent(cursor)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) {
        setError("Could not load more reviews.");
        return;
      }
      const page = (await response.json()) as { reviews?: Review[]; nextCursor?: string };

      if (which === "pending") {
        setPending((current) => [...current, ...(page.reviews ?? [])]);
        setPendingCursor(page.nextCursor);
      } else {
        setPublished((current) => [...current, ...(page.reviews ?? [])]);
        setPublishedCursor(page.nextCursor);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setExtending(null);
    }
  }

  async function createInvite(body: Record<string, string>) {
    const response = await fetch("/api/admin/reviews/invites", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("invite");
    return (await response.json()).invite as ReviewInvite;
  }

  /** A link for whoever the team wants a review from. */
  async function createLink() {
    setError(null);
    setCreating(true);
    try {
      const created = await createInvite({ label, locale });
      setInvites((current) => [created, ...current]);
      setLabel("");
    } catch {
      setError("Could not create that link.");
    } finally {
      setCreating(false);
    }
  }

  async function moderate(id: string, next: Review["status"]) {
    setError(null);
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!response.ok) throw new Error("moderate");
      const { review } = (await response.json()) as { review: Review };

      setPending((current) => current.filter((item) => item.id !== id));
      setPublished((current) => current.filter((item) => item.id !== id));
      if (next === "approved") setPublished((current) => [review, ...current]);
      if (next === "pending") setPending((current) => [review, ...current]);
    } catch {
      setError("Could not save that decision.");
    }
  }

  async function remove(review: Review) {
    /* The one action with no undo, so it asks — and says whose words are
       about to go, because the rows look alike at a glance. */
    if (!window.confirm(`Delete the review from ${review.author}? This cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/admin/reviews?id=${encodeURIComponent(review.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("delete");
      setPending((current) => current.filter((item) => item.id !== review.id));
      setPublished((current) => current.filter((item) => item.id !== review.id));
    } catch {
      setError("Could not delete that review.");
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-charcoal/45">Loading…</p>;
  }

  if (status === "unavailable") {
    return (
      <p className="rounded-2xl border border-stone-dark bg-stone/20 p-5 text-sm leading-relaxed text-charcoal">
        Reviews need Firebase. Set the Firebase variables and check
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
          photographs; deleting removes the review altogether.
        </p>

        {pending.length === 0 ? (
          <p className="mt-5 text-sm text-charcoal/45">No reviews waiting.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {pending.map((review) => (
              <ReviewCard key={review.id} review={review}>
                <Action onClick={() => void moderate(review.id, "approved")} tone="solid">
                  Publish
                </Action>
                <Action onClick={() => void moderate(review.id, "rejected")}>Reject</Action>
                <Action onClick={() => void remove(review)} tone="danger">
                  Delete
                </Action>
              </ReviewCard>
            ))}
          </ul>
        )}

        {pendingCursor && (
          <MoreButton
            busy={extending === "pending"}
            onClick={() => void loadMore("pending")}
          />
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl text-charcoal">Published</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">
          Live on the site now. Unpublishing sends one back to the queue with its
          photographs; deleting removes it for good.
        </p>

        {published.length === 0 ? (
          <p className="mt-5 text-sm text-charcoal/45">Nothing published yet.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {published.map((review) => (
              <ReviewCard key={review.id} review={review}>
                <Action onClick={() => void moderate(review.id, "pending")}>Unpublish</Action>
                <Action onClick={() => void remove(review)} tone="danger">
                  Delete
                </Action>
              </ReviewCard>
            ))}
          </ul>
        )}

        {publishedCursor && (
          <MoreButton
            busy={extending === "approved"}
            onClick={() => void loadMore("approved")}
          />
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl text-charcoal">Review links</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal/55">
          For anyone you want a review from — no enquiry and no email address
          needed. Make a link, send it however you are already talking to them.
          Each one works once and expires after 60 days.
        </p>

        <div className="mt-5 rounded-2xl border border-stone-dark bg-warm-white p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                Who is it for? (for your eyes only)
              </span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="e.g. Hansen family, Yala, March"
                className="mt-1.5 min-h-10 w-full rounded-xl border border-stone-dark bg-stone/20 px-3 text-sm text-charcoal"
              />
            </label>

            <label>
              <span className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                Language
              </span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                className="mt-1.5 min-h-10 rounded-xl border border-stone-dark bg-stone/20 px-3 text-sm text-charcoal"
              >
                {locales.map((option) => (
                  <option key={option} value={option}>
                    {localeNames[option]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void createLink()}
              disabled={creating}
              className="min-h-10 rounded-full bg-forest px-5 text-sm font-medium text-warm-white hover:bg-forest-dark disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create link"}
            </button>
          </div>
        </div>

        {invites.length === 0 ? (
          <p className="mt-5 text-sm text-charcoal/45">No links yet.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {invites.map((invite) => (
              <li
                key={invite.token}
                className="rounded-2xl border border-stone-dark bg-warm-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-charcoal">
                    {invite.label || invite.name || invite.reference || "Untitled link"}
                  </p>
                  <p className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
                    {new Date(invite.createdAt).toLocaleDateString("en-GB")} ·{" "}
                    {localeNames[invite.locale as Locale] ?? invite.locale} · {inviteState(invite)}
                  </p>
                </div>
                {invite.reference && (
                  <p className="mt-1 text-sm text-charcoal/60">Enquiry {invite.reference}</p>
                )}

                {/* A spent or stale link is kept in the list — it is the record
                    that this person was already asked — but there is nothing
                    left to send, so it is not offered. */}
                {inviteState(invite) === "Waiting" && <CopyField value={linkFor(invite)} />}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

/** One review, with whatever buttons the section it sits in wants. */
function ReviewCard({ review, children }: { review: Review; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-stone-dark bg-warm-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-charcoal">
          {review.author}
          {review.country ? `, ${review.country}` : ""}
        </p>
        <p className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
          {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)} · {review.reference ?? "direct link"}
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
              key={photo.url}
              src={photo.url}
              alt=""
              className="h-28 w-36 rounded-xl border border-stone-dark object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">{children}</div>
    </li>
  );
}

function Action({
  onClick,
  tone = "outline",
  children,
}: {
  onClick: () => void;
  tone?: "solid" | "outline" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    solid: "bg-forest text-warm-white hover:bg-forest-dark",
    outline: "border border-stone-dark text-charcoal hover:border-clay",
    danger: "border border-clay text-clay hover:bg-clay hover:text-warm-white",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full px-5 text-sm font-medium ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

/** A link, ready to be copied into whatever conversation is already open. */
function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-4">
      <p className="font-utility text-xs uppercase tracking-wide text-charcoal/50">
        Send this link
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-stone-dark bg-stone/20 px-3 text-xs text-charcoal"
        />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          className="min-h-10 rounded-full border border-forest px-4 text-sm font-medium text-forest hover:bg-forest hover:text-warm-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-charcoal/50">Works once, expires in 60 days.</p>
    </div>
  );
}

function linkFor(invite: ReviewInvite) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/${invite.locale}/review/${invite.token}`;
}

function inviteState(invite: ReviewInvite) {
  if (invite.usedAt) return "Review received";
  return new Date(invite.expiresAt) > new Date() ? "Waiting" : "Expired";
}

function MoreButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="mt-5 min-h-10 rounded-full border border-stone-dark px-5 text-sm text-charcoal/70 transition-colors hover:border-forest hover:text-forest disabled:opacity-60"
    >
      {busy ? "Loading…" : "Load more"}
    </button>
  );
}
