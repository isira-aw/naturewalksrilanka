"use client";

import { useState } from "react";

/**
 * Newsletter sign-up, with a success state that replaces the form rather than
 * sitting above it.
 *
 * That choice matters: a form left on screen under a "thank you" invites the
 * same person to submit again, and every one of those is a write. Swapping it
 * out says the job is done.
 *
 * Four states, no more: idle, sending, done, failed. There is no optimistic
 * "subscribed!" before the server answers — the whole point of the request is
 * to find out whether it worked, and Firebase being unconfigured or
 * unreachable is exactly the case where a cheerful lie is worst.
 */

type Labels = {
  title: string;
  body: string;
  placeholder: string;
  submit: string;
  sending: string;
  success: string;
  invalid: string;
  failed: string;
  /** Visually hidden label for the honeypot, for the few screen readers that reach it. */
  honeypot: string;
};

type State = "idle" | "sending" | "done" | "failed";

export function NewsletterSignUp({ locale, labels }: { locale: string; labels: Labels }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, company }),
      });

      if (!response.ok) {
        setState("failed");
        /* 400 is the address; anything else is us. Saying which saves the
           visitor retyping a perfectly good address. */
        setMessage(response.status === 400 ? labels.invalid : labels.failed);
        return;
      }

      setState("done");
    } catch {
      setState("failed");
      setMessage(labels.failed);
    }
  }

  return (
    <div className="print:hidden">
      <h2 className="font-utility text-xs uppercase tracking-[0.15em] text-warm-white/70">
        {labels.title}
      </h2>

      {state === "done" ? (
        <p
          role="status"
          className="mt-3 flex items-start gap-2.5 text-sm leading-relaxed text-warm-white"
        >
          <svg viewBox="0 0 14 14" className="mt-1 h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1.5 7.5 5 11l7.5-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {labels.success}
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-warm-white/60">
            {labels.body}
          </p>

          <form onSubmit={onSubmit} className="mt-4 max-w-sm">
            {/* The honeypot. Hidden from people, left empty by them, and a
                giveaway when a bot fills it. `aria-hidden` plus tabIndex -1
                keeps it out of the keyboard path too. */}
            <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="nwsl-company">{labels.honeypot}</label>
              <input
                id="nwsl-company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <label htmlFor="nwsl-email" className="sr-only">
                {labels.placeholder}
              </label>
              <input
                id="nwsl-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={labels.placeholder}
                aria-invalid={state === "failed" || undefined}
                aria-describedby={message ? "nwsl-message" : undefined}
                className="min-h-11 min-w-0 flex-1 rounded-full border border-warm-white/25 bg-transparent px-4 text-sm text-warm-white outline-none transition-colors placeholder:text-warm-white/40 focus:border-warm-white/70"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="min-h-11 shrink-0 rounded-full bg-warm-white px-5 text-sm font-medium text-charcoal transition-colors hover:bg-stone disabled:opacity-50"
              >
                {state === "sending" ? labels.sending : labels.submit}
              </button>
            </div>

            {message && (
              <p id="nwsl-message" role="alert" className="mt-3 text-sm text-clay">
                {message}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
