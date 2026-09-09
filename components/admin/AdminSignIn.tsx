"use client";

import { useState } from "react";

/**
 * The gate.
 *
 * Nothing here knows the credentials: the form posts them to
 * `/api/admin/session`, which is the only place either value exists, and gets
 * back an httpOnly cookie. So the address and the password are never in the
 * page source, never in the JavaScript bundle, and never readable from the
 * browser — and the form gives no hint about either.
 */
export function AdminSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setError("Those details were not recognised.");
        return;
      }
      onSignedIn();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-stone-dark bg-warm-white p-6 shadow-[0_1px_2px_rgba(28,30,27,0.04)] sm:p-8"
      >
        <h1 className="font-display text-2xl text-charcoal">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-charcoal/55">
          This area is for Nature Walk Sri Lanka staff.
        </p>

        <label className="mt-6 block">
          <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
          />
        </label>

        <label className="mt-4 block">
          <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
            Password
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
          />
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 min-h-11 w-full rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
