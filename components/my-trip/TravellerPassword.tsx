"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";

/**
 * Signing in with a password, for travellers who would rather keep one.
 *
 * The emailed link asks for an email every single time. A password asks for
 * one **once** — and that once is not negotiable, because
 * `createTravellerSession` refuses any token whose address is unverified,
 * and it has to: without that check anybody could register with somebody
 * else's address and read their enquiries. So the account is created, the
 * address is confirmed by a link, and after that the password is enough
 * forever.
 *
 * Nothing here holds the password. Firebase does the hashing, the storage
 * and the reset, and this component never sees it after the request.
 */

type Mode = "signIn" | "register" | "reset";
type Phase = "idle" | "working" | "sent" | "unverified";

/** Firebase's codes, narrowed to the ones worth a different sentence. */
function messageFor(code: string, t: (key: string) => string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return t("accountExists");
    case "auth/weak-password":
      return t("weakPassword");
    case "auth/invalid-email":
      return t("invalidEmail");
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      /* One sentence for all three: which of them it was tells somebody
         whether an address has an account here, and that is not their
         business. */
      return t("wrongPassword");
    case "auth/too-many-requests":
      return t("tooManyTries");
    default:
      return t("passwordFailed");
  }
}

export function TravellerPassword({ onUseLink }: { onUseLink: () => void }) {
  const t = useTranslations("myTrip");
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  function fail(error: unknown) {
    const code = (error as { code?: string } | null)?.code ?? "";
    setPhase("idle");
    setMessage(messageFor(code, t));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const auth = firebaseAuth();
    if (!auth) return;

    setPhase("working");
    setMessage(null);

    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim());
        setPhase("sent");
        setMessage(t("resetSent"));
        return;
      }

      const credential =
        mode === "register"
          ? await createUserWithEmailAndPassword(auth, email.trim(), password)
          : await signInWithEmailAndPassword(auth, email.trim(), password);

      /* The one email a password account cannot avoid. Until the address is
         confirmed the server will refuse the token, so there is no point
         asking it for a session. */
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        setPhase("unverified");
        setMessage(t("verifyNeeded"));
        return;
      }

      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/traveller/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) throw new Error("session");

      window.location.reload();
    } catch (error) {
      fail(error);
    }
  }

  const title = mode === "reset" ? t("resetTitle") : mode === "register" ? t("registerTitle") : t("passwordTitle");
  const body = mode === "reset" ? t("resetBody") : mode === "register" ? t("registerBody") : t("passwordBody");
  const submitLabel =
    mode === "reset" ? t("resetSubmit") : mode === "register" ? t("registerSubmit") : t("signIn");

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-warm-white p-6 sm:p-8"
    >
      <h1 className="font-display text-2xl text-charcoal">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/60">{body}</p>

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

      {mode !== "reset" && (
        <label className="mt-4 block">
          <span className="font-utility text-xs uppercase tracking-wide text-charcoal/55">
            {t("passwordLabel")}
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-dark bg-warm-white px-3.5 text-sm text-charcoal outline-none focus:border-forest focus:ring-1 focus:ring-forest"
          />
        </label>
      )}

      {message && (
        <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm leading-relaxed text-charcoal">
          {message}
        </p>
      )}

      {phase !== "sent" && phase !== "unverified" && (
        <Button type="submit" variant="primary" disabled={phase === "working"} className="mt-6 w-full">
          {phase === "working" ? t("sending") : submitLabel}
        </Button>
      )}

      <div className="mt-5 space-y-2 text-sm">
        {mode === "signIn" && (
          <>
            <Switch onClick={() => { setMode("register"); setMessage(null); setPhase("idle"); }}>
              {t("createAccount")}
            </Switch>
            <Switch onClick={() => { setMode("reset"); setMessage(null); setPhase("idle"); }}>
              {t("forgotPassword")}
            </Switch>
          </>
        )}
        {mode !== "signIn" && (
          <Switch onClick={() => { setMode("signIn"); setMessage(null); setPhase("idle"); }}>
            {t("backToSignIn")}
          </Switch>
        )}
        <Switch onClick={onUseLink}>{t("useLinkInstead")}</Switch>
      </div>
    </form>
  );
}

function Switch({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block text-charcoal/60 underline underline-offset-4 transition-colors hover:text-forest"
    >
      {children}
    </button>
  );
}
