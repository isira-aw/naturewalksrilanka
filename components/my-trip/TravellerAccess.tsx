"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";
import { firebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";

/**
 * Proving you are the person who sent an enquiry.
 *
 * An emailed link rather than a password: travellers use this once or twice
 * and would otherwise be creating an account for a single tour, then
 * forgetting it. It also means the site never holds a password for someone
 * who is not staff.
 *
 * The reference in the URL is not a credential — it is five readable
 * characters, printed on the WhatsApp message, and a neighbouring code is
 * easy to guess. It says *which* trip; this component establishes *who*.
 */

/* Firebase requires the address again when the link is opened, because the
   link itself does not carry it. Keeping it here means the traveller
   usually does not have to retype it — but the sign-in still works if this
   is lost, by asking. */
const PENDING_EMAIL_KEY = "nwsl_pending_email";

type Phase = "idle" | "sending" | "sent" | "completing" | "error";

export function TravellerAccess({ reference }: { reference: string }) {
  const t = useTranslations("myTrip");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  /* Returning from the emailed link: finish the sign-in, swap the Firebase
     credential for an httpOnly cookie, and reload so the server renders the
     trip. */
  /* Reading the URL and browser storage on mount, then reporting what was
     found. The rule cannot tell this apart from a cascading render, but
     both inputs are browser-only: reading them during render would break
     this prerendered page's hydration. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(PENDING_EMAIL_KEY);
    } catch {
      /* Private mode, or storage blocked. Ask for the address instead. */
    }
    if (!stored) {
      setPhase("error");
      setMessage(t("reenterEmail"));
      return;
    }

    setPhase("completing");
    void (async () => {
      try {
        const credential = await signInWithEmailLink(auth, stored, window.location.href);
        const idToken = await credential.user.getIdToken();
        const response = await fetch("/api/traveller/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ idToken }),
        });
        if (!response.ok) throw new Error("session");

        try {
          window.localStorage.removeItem(PENDING_EMAIL_KEY);
        } catch {
          /* Nothing useful to do. */
        }
        /* Strip the sign-in parameters so a refresh does not try to reuse a
           spent link, and let the server render the trip. */
        window.location.replace(window.location.pathname);
      } catch {
        setPhase("error");
        setMessage(t("linkExpired"));
      }
    })();
  }, [t]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const auth = firebaseAuth();
    if (!auth) {
      setPhase("error");
      setMessage(t("unavailable"));
      return;
    }

    setPhase("sending");
    setMessage(null);
    try {
      try {
        window.localStorage.setItem(PENDING_EMAIL_KEY, email.trim());
      } catch {
        /* The link still works; the traveller will be asked to retype. */
      }
      await sendSignInLinkToEmail(auth, email.trim(), {
        url: window.location.href,
        handleCodeInApp: true,
      });
      setPhase("sent");
    } catch {
      setPhase("error");
      setMessage(t("sendFailed"));
    }
  }

  if (!isFirebaseClientConfigured()) {
    return <Notice>{t("unavailable")}</Notice>;
  }

  if (phase === "completing") {
    return <Notice>{t("signingIn")}</Notice>;
  }

  if (phase === "sent") {
    return (
      <Notice>
        {t("linkSent", { email: email.trim() })}
        <span className="mt-2 block text-charcoal/55">{t("linkSentHint")}</span>
      </Notice>
    );
  }

  return (
    <form
      onSubmit={sendLink}
      className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-warm-white p-6 sm:p-8"
    >
      <h1 className="font-display text-2xl text-charcoal">{t("accessTitle")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/60">
        {t("accessBody", { reference })}
      </p>

      <label className="mt-6 block">
        <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
          {t("emailLabel")}
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
        />
      </label>

      {message && (
        <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={phase === "sending"} className="mt-6 w-full">
        {phase === "sending" ? t("sending") : t("sendLink")}
      </Button>
    </form>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-stone/20 p-6 text-sm leading-relaxed text-charcoal">
      {children}
    </p>
  );
}
