"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";
import { firebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { TravellerPassword } from "./TravellerPassword";

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

type Phase = "idle" | "sending" | "sent" | "completing" | "confirm" | "error";

export function TravellerAccess({
  reference,
  referenceAccess = false,
}: {
  reference?: string;
  /** Whether this deployment can open a trip by reference at all. */
  referenceAccess?: boolean;
}) {
  const t = useTranslations("myTrip");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  /**
   * The emailed link, held from the moment it is recognised.
   *
   * Captured rather than re-read at submit time: the address may be asked
   * for, and whatever happens to the location bar in between, the one-time
   * code has to be the one that arrived.
   */
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  /** Which way in is on screen. The link leads, because it needs nothing set
      up first; a password is better only for somebody who comes back. */
  const [usePassword, setUsePassword] = useState(false);

  /**
   * Whether the one-time code has already been handed to Firebase.
   *
   * A sign-in link is spent by the first `signInWithEmailLink` that succeeds.
   * Without this guard a second run of the effect — React Strict Mode calls
   * every effect twice in development, and a dependency that is not
   * referentially stable does the same in production — spends the code on
   * the first call and then fails on the second, reporting the link as
   * expired *because the page itself had just used it*. That is the
   * "expired or already used" message appearing on a link that was neither.
   */
  const spent = useRef(false);

  /** Finishes a sign-in, once the address is known. */
  const complete = useCallback(
    async (address: string, link: string) => {
      const auth = firebaseAuth();
      if (!auth) return;

      setPhase("completing");
      setMessage(null);
      try {
        const credential = await signInWithEmailLink(auth, address, link);
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
    },
    [t],
  );

  /* Returning from the emailed link: finish the sign-in, swap the Firebase
     credential for an httpOnly cookie, and reload so the server renders the
     trip. */
  /* Reading the URL and browser storage on mount, then reporting what was
     found. The rule cannot tell this apart from a cascading render, but
     both inputs are browser-only: reading them during render would break
     this prerendered page's hydration. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (spent.current) return;

    const auth = firebaseAuth();
    if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return;

    const link = window.location.href;
    setPendingLink(link);

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(PENDING_EMAIL_KEY);
    } catch {
      /* Private mode, or storage blocked. Ask for the address instead. */
    }

    /* Opened on a different device from the one that asked, or in a private
       window, or with storage cleared. The link is still perfectly good —
       Firebase only needs the address again, because the link does not carry
       it. So ask for it and finish, rather than sending them back to request
       another link that would land in the same place. */
    if (!stored) {
      setPhase("confirm");
      setMessage(t("reenterEmail"));
      return;
    }

    spent.current = true;
    void complete(stored, link);
  }, [t, complete]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** The address, retyped, for a link opened where it was not requested. */
  function confirmEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingLink || spent.current) return;
    spent.current = true;
    void complete(email.trim(), pendingLink);
  }

  /**
   * Opening this one trip with the reference and the address, no email.
   *
   * Only offered on a page that already names a reference, because that is
   * the whole of what it can open — see `lib/tourRequests/referenceAccess.ts`.
   */
  async function unlock() {
    if (!reference) return;
    /* This button is outside the form's own validation — it has to be, or
       pressing it would submit the form and send a link instead — so the
       empty case is caught here rather than looking like a dead button. */
    if (!email.trim()) {
      setMessage(t("emailNeeded"));
      return;
    }
    setPhase("sending");
    setMessage(null);
    try {
      const response = await fetch("/api/traveller/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reference, email: email.trim() }),
      });
      if (response.ok) {
        /* The server renders the trip once the cookie is set. */
        window.location.reload();
        return;
      }
      setPhase("idle");
      setMessage(response.status === 429 ? t("unlockThrottled") : t("unlockFailed"));
    } catch {
      setPhase("idle");
      setMessage(t("unlockFailed"));
    }
  }

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

  if (usePassword && phase !== "confirm") {
    return <TravellerPassword onUseLink={() => setUsePassword(false)} />;
  }

  /* The link is good; only the address is missing. A separate form from the
     one below, because this finishes the sign-in rather than starting a new
     one — asking for another link here is what made a working link look
     broken. */
  if (phase === "confirm") {
    return (
      <form
        onSubmit={confirmEmail}
        className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-warm-white p-6 sm:p-8"
      >
        <h1 className="font-display text-2xl text-charcoal">{t("confirmTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-charcoal/60">{t("confirmBody")}</p>

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

        <Button type="submit" variant="primary" className="mt-6 w-full">
          {t("confirmSubmit")}
        </Button>
      </form>
    );
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
        {reference
          ? t(referenceAccess ? "accessBodyUnlock" : "accessBody", { reference })
          : t("tripsAccessBody")}
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

      {/* With a reference on the page there is a way in that needs no email
          at all, so it leads. The emailed link stays underneath it: it proves
          more, and it is the only way to reach the full list of trips. */}
      {reference && referenceAccess ? (
        <>
          <Button
            type="button"
            variant="primary"
            disabled={phase === "sending"}
            onClick={() => void unlock()}
            className="mt-6 w-full"
          >
            {t("unlockSubmit")}
          </Button>
          <p className="mt-2 text-xs leading-relaxed text-charcoal/50">{t("unlockHint")}</p>
          <button
            type="submit"
            disabled={phase === "sending"}
            className="mt-4 w-full text-sm text-charcoal/60 underline underline-offset-4 transition-colors hover:text-forest disabled:opacity-50"
          >
            {phase === "sending" ? t("sending") : t("sendLink")}
          </button>
        </>
      ) : (
        <Button
          type="submit"
          variant="primary"
          disabled={phase === "sending"}
          className="mt-6 w-full"
        >
          {phase === "sending" ? t("sending") : t("sendLink")}
        </Button>
      )}
      <button
        type="button"
        onClick={() => setUsePassword(true)}
        className="mt-5 block w-full text-sm text-charcoal/60 underline underline-offset-4 transition-colors hover:text-forest"
      >
        {t("usePasswordInstead")}
      </button>
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
