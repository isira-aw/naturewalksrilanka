"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COMMENT_BODY_LIMIT, type CommentAuthor } from "@/lib/tourRequests/types";

/**
 * The conversation on one enquiry, for whichever side is reading it.
 *
 * One component for both panels, because the thread is one thing and two
 * implementations of it would drift — the traveller would end up seeing
 * replies in a different order, or a different length limit, from the person
 * who wrote them. What differs between the two sides is not behaviour, so it
 * is passed in: the endpoint to talk to, the words to show, and whether an
 * author's address is worth displaying.
 *
 * Note what is *not* shared: authorisation. Each side has its own route
 * handler proving its own kind of session, and this component holds no
 * opinion about who may post — it sends to the endpoint it was given and
 * reports what comes back.
 *
 * Comments cannot be edited or deleted once sent, by either side. A record
 * of what was said that can be quietly rewritten afterwards is not a record,
 * and this thread exists precisely because the enquiry above it is fixed.
 */

export type ThreadComment = {
  id: string;
  author: CommentAuthor;
  body: string;
  createdAt: string;
  /** Only the team's copy carries this; the traveller's never does. */
  authorEmail?: string;
};

export type ThreadLabels = {
  title: string;
  intro: string;
  placeholder: string;
  submit: string;
  submitting: string;
  empty: string;
  loading: string;
  failed: string;
  full: string;
  /** How each side is named in the transcript. */
  fromTraveller: string;
  fromStaff: string;
};

export function CommentThread({
  endpoint,
  labels,
  showAuthorEmail = false,
}: {
  endpoint: string;
  labels: ThreadLabels;
  showAuthorEmail?: boolean;
}) {
  const [comments, setComments] = useState<ThreadComment[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(endpoint, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(labels.failed);
          /* An empty thread rather than a permanent spinner: the form below
             still works, and one failed read should not hide it. */
          setComments([]);
          return;
        }
        const { comments: loaded } = (await response.json()) as { comments: ThreadComment[] };
        setComments(loaded);
      } catch {
        if (controller.signal.aborted) return;
        setError(labels.failed);
        setComments([]);
      }
    })();
    return () => controller.abort();
  }, [endpoint, labels.failed]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = body.trim();
      if (!trimmed || sending) return;

      setSending(true);
      setError(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        });

        if (!response.ok) {
          setError(response.status === 409 ? labels.full : labels.failed);
          return;
        }

        const { comment } = (await response.json()) as { comment: ThreadComment };
        setComments((current) => [...(current ?? []), comment]);
        /* Cleared only once it is known to have been saved. Clearing on
           submit loses what somebody wrote the moment the network drops. */
        setBody("");
        field.current?.focus();
      } catch {
        setError(labels.failed);
      } finally {
        setSending(false);
      }
    },
    [body, endpoint, labels.failed, labels.full, sending],
  );

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-charcoal">{labels.title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">{labels.intro}</p>

      {comments === null ? (
        <p className="mt-5 text-sm text-charcoal/45">{labels.loading}</p>
      ) : comments.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-stone-dark px-5 py-6 text-sm leading-relaxed text-charcoal/55">
          {labels.empty}
        </p>
      ) : (
        <ol className="mt-5 space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className={
                comment.author === "staff"
                  ? "rounded-2xl border border-stone-dark bg-forest/5 px-5 py-4"
                  : "rounded-2xl border border-stone-dark bg-stone/20 px-5 py-4"
              }
            >
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-utility text-[11px] uppercase tracking-wide text-forest">
                  {comment.author === "staff" ? labels.fromStaff : labels.fromTraveller}
                </span>
                {showAuthorEmail && comment.authorEmail && (
                  <span className="text-xs text-charcoal/45">{comment.authorEmail}</span>
                )}
                <time
                  dateTime={comment.createdAt}
                  className="ml-auto text-xs tabular-nums text-charcoal/40"
                >
                  {comment.createdAt.slice(0, 10)}
                </time>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
                {comment.body}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={(event) => void submit(event)} className="mt-5">
        <label className="block">
          <span className="sr-only">{labels.placeholder}</span>
          <textarea
            ref={field}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={labels.placeholder}
            rows={3}
            maxLength={COMMENT_BODY_LIMIT}
            className="w-full rounded-xl border border-stone-dark bg-warm-white px-4 py-3 text-sm leading-relaxed text-charcoal"
          />
        </label>
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="mt-3 min-h-11 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          {sending ? labels.submitting : labels.submit}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}
    </section>
  );
}
