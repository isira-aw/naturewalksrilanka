"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";

/**
 * The gate, for travellers.
 *
 * Deliberately the same shape as `components/admin/AdminSignIn.tsx`: one
 * button, the visitor's own Google account, and an httpOnly cookie minted by
 * a route handler. Two populations, one mechanism — which is a smaller thing
 * to maintain and, more to the point, a smaller thing to get wrong.
 *
 * What stood here before was three alternatives on one screen: an emailed
 * link, a password account with registration and reset, and a form that
 * opened a single trip from its reference and the address on it. Three
 * flows, three sets of failure messages, three amounts of access to the same
 * page, and a traveller having to choose between them before they could see
 * anything. All three are gone, and none of them is coming back as a
 * fallback: a way in that appears exactly when the main one is broken is the
 * one an attacker arranges to meet.
 *
 * Success is reported by asking the server to render again rather than by
 * flipping client state. The page decides between this form and the trips,
 * and it decides on the server — the cookie it reads is httpOnly, so the
 * page cannot see it and must not pretend to.
 */
export function TravellerSignIn() {
  const t = useTranslations("myTrip");

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-dark bg-warm-white p-6 shadow-[0_1px_2px_rgba(28,30,27,0.04)] sm:p-8">
      <h1 className="font-display text-2xl text-charcoal">{t("signInTitle")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/55">{t("signInBody")}</p>
      {isFirebaseClientConfigured() ? (
        <GoogleSignIn />
      ) : (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm leading-relaxed text-charcoal"
        >
          {t("unavailable")}
        </p>
      )}
    </div>
  );
}

function GoogleSignIn() {
  const t = useTranslations("myTrip");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const auth = firebaseAuth();
    if (!auth) {
      setError(t("unavailable"));
      return;
    }

    setBusy(true);
    setError(null);
    let admitted = false;
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const response = await fetch("/api/traveller/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ idToken: await credential.user.getIdToken() }),
      });

      if (!response.ok) {
        /* Signed in to Google but not admitted here — a staff account, which
           the session route refuses on purpose. Sign back out of Firebase,
           or the next attempt silently reuses the same rejected account and
           looks like the button is broken. */
        await signOut(auth).catch(() => {});
        setError(response.status === 403 ? t("signInRefused") : t("signInFailed"));
        return;
      }

      admitted = true;
      router.refresh();
    } catch (caught) {
      const code = (caught as { code?: string } | null)?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError(null);
      } else if (code === "auth/popup-blocked") {
        setError(t("popupBlocked"));
      } else {
        setError(t("signInFailed"));
      }
    } finally {
      /* Left busy on success: the button stays disabled until the trips
         replace this form, rather than flashing ready again. */
      if (!admitted) setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className="mt-6 min-h-11 w-full rounded-full bg-forest px-6 text-sm font-medium text-warm-white transition-colors hover:bg-forest-dark disabled:opacity-60"
      >
        {busy ? t("signingIn") : t("continueWithGoogle")}
      </button>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-charcoal/45">{t("signInHint")}</p>
    </>
  );
}
