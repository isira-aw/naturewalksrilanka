"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";

/**
 * The gate.
 *
 * One way in: the staff member's own Google account, through Firebase
 * Authentication. No password exists to share, leak or forget, each person is
 * individually identifiable in the logs, and removing someone is one
 * revocation rather than a password change for everybody.
 *
 * There is no second form here. A deployment without Firebase configured
 * shows why it cannot sign anyone in rather than offering a weaker
 * alternative — see `lib/admin/auth.ts`.
 *
 * The ID token goes straight to `/api/admin/session` and comes back as an
 * httpOnly cookie, so nothing sensitive is readable from the page.
 *
 * Success is reported by asking the server to render again rather than by
 * flipping a piece of client state. `admin/layout.tsx` decides between this
 * form and the panel, and it decides on the server — the cookie it reads is
 * httpOnly, so the page cannot see it and must not pretend to.
 */
export function AdminSignIn() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-stone-dark bg-warm-white p-6 shadow-[0_1px_2px_rgba(28,30,27,0.04)] sm:p-8">
        <h1 className="font-display text-2xl text-charcoal">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-charcoal/55">
          This area is for Nature Walk Sri Lanka staff.
        </p>
        {isFirebaseClientConfigured() ? (
          <GoogleSignIn />
        ) : (
          <Unavailable />
        )}
      </div>
    </div>
  );
}

/**
 * Shown when this deployment has no Firebase project behind it. Stating the
 * cause plainly is the whole point: the previous behaviour was to offer a
 * shared password instead, which meant a misconfigured deployment silently
 * downgraded its own authentication.
 */
function Unavailable() {
  return (
    <p role="alert" className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm leading-relaxed text-charcoal">
      Sign-in is unavailable: this deployment has no Firebase configuration.
      Set the Firebase environment variables and redeploy.
    </p>
  );
}

function postToken(idToken: string) {
  return fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ idToken }),
  });
}

function GoogleSignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const auth = firebaseAuth();
    if (!auth) {
      setError("Sign-in is not configured on this deployment.");
      return;
    }

    setBusy(true);
    setError(null);
    let admitted = false;
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();

      let response = await postToken(idToken);

      /* First sign-in since being added to the staff list: the server has
         just granted the admin claim, but this token was minted before it
         existed. A fresh one carries it. Once, ever, per staff member. */
      if (response.status === 409) {
        response = await postToken(await credential.user.getIdToken(true));
      }

      if (!response.ok) {
        /* Signed in to Google but not admitted here. Sign back out of
           Firebase, or the next attempt silently reuses the same rejected
           account and looks like the button is broken. */
        await signOut(auth).catch(() => {});
        setError(
          response.status === 403
            ? "That account is not on the staff list."
            : response.status === 429
              ? "Too many attempts from this account. Wait fifteen minutes and try again."
              : "Could not sign in. Try again shortly.",
        );
        return;
      }

      /* The cookie is set; re-render from the server so the layout sees it.
         `busy` is deliberately left true — the button stays disabled until
         the panel replaces this form, rather than flashing ready again. */
      admitted = true;
      router.refresh();
      return;
    } catch (caught) {
      const code = (caught as { code?: string } | null)?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError(null);
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the sign-in window. Allow pop-ups and try again.");
      } else {
        setError("Could not reach the sign-in service. Check your connection.");
      }
    } finally {
      if (!admitted) setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="mt-6 min-h-11 w-full rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Continue with Google"}
      </button>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-charcoal/45">
        Use your Nature Walk staff account. If you have not been added yet, ask
        whoever administers the site.
      </p>
    </>
  );
}
