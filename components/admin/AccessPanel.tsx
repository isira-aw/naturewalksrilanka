"use client";

import { useEffect, useState } from "react";

/**
 * Who may sign in, and who has tried.
 *
 * The second half is the point as much as the first. Anyone who finds this
 * address can press the sign-in button, and until now the only trace was a
 * line in a server log nobody reads — while the attempt left a permanent
 * account in the Firebase project. The account is now deleted in the same
 * request that refuses it (`lib/admin/signInGuard.ts`); this is where the
 * attempt itself becomes visible.
 */
type StaffEntry = {
  email: string;
  addedAt?: string;
  addedBy?: string;
  hasAccount: boolean;
};

type RefusedAttempt = { email: string; at: string; reason: string };

type Access = {
  staff: StaffEntry[];
  refusals: RefusedAttempt[];
  /** Whether this admin may change the list, not merely read it. */
  canEdit: boolean;
  /** Whether SUPER_ADMIN_EMAIL is set at all on this deployment. */
  superAdminConfigured: boolean;
  /** Only sent to a super admin; empty otherwise. */
  superAdmins: string[];
};

/* Only one refusal reason can actually occur. Being on the list without the
   claim is no longer a refusal — the claim is granted on first sign-in — so
   there is no entry for it. Anything unrecognised is shown verbatim. */
const REASONS: Record<string, string> = {
  not_staff: "Not on the staff list",
};

export function AccessPanel() {
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [refusals, setRefusals] = useState<RefusedAttempt[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [superAdminConfigured, setSuperAdminConfigured] = useState(true);
  const [superAdmins, setSuperAdmins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/access", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!response.ok) {
          setError(
            response.status === 503
              ? "Firebase is not reachable, so the access list cannot be read."
              : "Could not load the access list.",
          );
          setLoading(false);
          return;
        }
        const data = (await response.json()) as Access;
        if (cancelled) return;
        setStaff(data.staff);
        setRefusals(data.refusals);
        setCanEdit(data.canEdit);
        setSuperAdminConfigured(data.superAdminConfigured);
        setSuperAdmins(data.superAdmins);
        setError(null);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not reach the server.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      if (!response.ok) {
        setError(
          response.status === 400
            ? "That does not look like an email address."
            : "Could not add that address.",
        );
        return;
      }
      setEmail("");
      setReload((n) => n + 1);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(address: string) {
    if (
      !window.confirm(
        `Remove ${address}? Any session they have open stops working on their next request.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/access?email=${encodeURIComponent(address)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(
          body.error === "cannot_remove_self"
            ? "You cannot remove your own access from here."
            : body.error === "cannot_remove_super_admin"
              ? "That is a super admin. Their access comes from the deployment's settings, not from this list."
              : "Could not remove that address.",
        );
        return;
      }
      setReload((n) => n + 1);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-charcoal">Access</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
        Everyone who may sign in to this panel. Adding an address is enough —
        the permission it needs is granted the first time they sign in.
      </p>

      {!loading && !canEdit && (
        <p className="mt-5 max-w-2xl rounded-xl bg-stone px-4 py-3 text-sm leading-relaxed text-charcoal/70">
          {superAdminConfigured
            ? "You can see this list but not change it. Adding an admin hands out the keys, so it is kept to the super admin set in the deployment's settings."
            : "This list cannot be changed: no super admin is configured. Set SUPER_ADMIN_EMAIL on the deployment and redeploy."}
        </p>
      )}

      {canEdit && superAdmins.length === 1 && (
        <p className="mt-5 max-w-2xl rounded-xl bg-stone px-4 py-3 text-sm leading-relaxed text-charcoal/70">
          You are the only super admin. If this account is lost, changing the
          access list needs a redeploy — SUPER_ADMIN_EMAIL takes a
          comma-separated list, so consider adding a second.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      {canEdit && (
      <form onSubmit={(event) => void add(event)} className="mt-6 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="staff-email">
          Email address to add
        </label>
        <input
          id="staff-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          className="min-h-10 min-w-0 flex-1 rounded-full border border-stone-dark bg-warm-white px-4 text-sm text-charcoal placeholder:text-charcoal/35"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-10 rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
        >
          Add
        </button>
      </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-charcoal/45">Loading…</p>
      ) : (
        <ul className="mt-8 divide-y divide-stone-dark border-y border-stone-dark">
          {staff.map((entry) => (
            <li key={entry.email} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <span className="text-sm text-charcoal">{entry.email}</span>
              {!entry.hasAccount && (
                <span
                  className="rounded-full bg-stone px-3 py-1 font-utility text-[11px] uppercase tracking-wide text-charcoal/50"
                  title="They have not signed in yet. Their permission is granted when they do."
                >
                  Not signed in yet
                </span>
              )}
              {entry.addedBy && (
                <span className="text-xs text-charcoal/40">
                  added by {entry.addedBy}
                  {entry.addedAt ? ` on ${entry.addedAt.slice(0, 10)}` : ""}
                </span>
              )}
              {canEdit && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(entry.email)}
                  className="ml-auto font-utility text-xs uppercase tracking-wide text-charcoal/50 transition-colors hover:text-clay disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10">
        <h3 className="font-display text-lg text-charcoal">Refused sign-ins</h3>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
          Anyone can reach the sign-in page, so attempts by people who are not
          staff are expected. The Google account each attempt creates is
          deleted straight away, so they do not accumulate in Firebase. A
          single address appearing repeatedly is worth a look; after five
          refusals in fifteen minutes it is turned away without being checked.
        </p>

        {refusals.length === 0 ? (
          <p className="mt-4 text-sm text-charcoal/45">Nothing refused recently.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-dark border-y border-stone-dark">
            {refusals.map((entry) => (
              <li
                key={`${entry.email}-${entry.at}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm"
              >
                <span className="text-charcoal/70">{entry.email}</span>
                <span className="text-xs text-charcoal/40">
                  {REASONS[entry.reason] ?? entry.reason}
                </span>
                <span className="ml-auto text-xs tabular-nums text-charcoal/40">
                  {entry.at.slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
