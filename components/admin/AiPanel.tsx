"use client";

import { useEffect, useState } from "react";

/**
 * What the AI in this site actually is.
 *
 * Which turns out to be one thing: translating itinerary text into the four
 * non-English locales. There is no chatbot, nothing on the public site calls
 * a model, and no customer data is ever sent anywhere. That is worth stating
 * plainly in the panel rather than leaving people to infer it, because "there
 * is an LLM in here somewhere" is exactly the kind of thing that grows
 * imaginary scope.
 *
 * `docs/llm.md` carries the same picture at length.
 */
type Status = { configured: boolean; model: string };
type Check = { ok: true; model: string } | { ok: false; model: string; error: string };

export function AiPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/ai", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!response.ok) {
          setError("Could not read the AI configuration.");
          return;
        }
        setStatus((await response.json()) as Status);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function test() {
    setTesting(true);
    setError(null);
    setCheck(null);
    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        credentials: "same-origin",
      });
      setCheck((await response.json()) as Check);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">AI</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
        One feature uses a language model: translating an itinerary&rsquo;s
        English text into Dutch, Spanish, Danish and Finnish. It runs only when
        somebody presses a button in the Translations section. Nothing else on
        this site calls a model.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-stone-dark bg-stone/30 p-5">
        <h3 className="font-display text-lg text-charcoal">Status</h3>
        {!status ? (
          <p className="mt-3 text-sm text-charcoal/45">Loading…</p>
        ) : (
          <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row label="Provider" value="Google Gemini" />
            <Row label="Model" value={status.model} />
            <Row
              label="API key"
              value={status.configured ? "Configured" : "Not set on this deployment"}
            />
            <Row label="Used by" value="Translations, on request only" />
          </dl>
        )}

        <button
          type="button"
          onClick={() => void test()}
          disabled={testing}
          className="mt-5 min-h-10 rounded-full border border-stone-dark px-5 text-sm text-charcoal/70 transition-colors hover:border-forest hover:text-forest disabled:opacity-60"
        >
          {testing ? "Checking…" : "Test the connection"}
        </button>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-charcoal/45">
          Sends one tiny request. It proves three separate things at once: the
          key is accepted, the model name still exists, and the service is
          reachable — which otherwise all fail looking identical.
        </p>

        {check && (
          <p
            role="status"
            className={
              check.ok
                ? "mt-4 rounded-xl bg-forest/10 px-4 py-3 text-sm text-forest"
                : "mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm leading-relaxed text-charcoal"
            }
          >
            {check.ok ? (
              <>Working. {check.model} answered.</>
            ) : (
              <>
                <strong className="font-medium">{check.model} did not answer.</strong>{" "}
                {check.error}
              </>
            )}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">What is sent</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-charcoal/70">
          <li>
            The itinerary&rsquo;s title, best time, suggested length, both
            content blocks and its highlight names and notes.
          </li>
          <li>Nothing else. One itinerary and one language per request.</li>
        </ul>

        <h3 className="mt-6 font-display text-lg text-charcoal">What is never sent</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal/70">
          Any customer data. No name, email, phone number, enquiry, review or
          journey document has ever been sent to a model, and no code path
          exists that could send one.
        </p>

        <h3 className="mt-6 font-display text-lg text-charcoal">What is not AI</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal/70">
          The journey plan is arithmetic, not a model: the driving order, the
          days at each stop and the distances are all worked out from the
          traveller&rsquo;s own choices, which is why the same selection always
          produces the same plan. The suggestions in the wizard are filters
          over the itineraries you have written. There is no chatbot.
        </p>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-lg text-charcoal">When it fails</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal/70">
          A failed translation never breaks anything. The itinerary keeps its
          English text, travellers reading another language see the English
          rather than blanks, and the Translations section shows why it failed
          so it can be retried. A translation that came back with a different
          number of highlights is rejected outright — it would misalign every
          &ldquo;what you might see&rdquo; entry against its photograph.
        </p>
      </section>
    </div>
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
