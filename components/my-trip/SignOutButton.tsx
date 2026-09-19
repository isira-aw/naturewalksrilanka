"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

/**
 * Signing out, on both halves.
 *
 * The server call is the one that matters: it revokes the refresh tokens, so
 * a session cookie copied elsewhere stops working rather than lasting its
 * fortnight. Signing out of Firebase in this tab as well is what stops the
 * next press of the sign-in button silently reusing the same account — which
 * looks, from the outside, exactly like a broken button.
 */
export function SignOutButton() {
  const t = useTranslations("myTrip");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await fetch("/api/traveller/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const auth = firebaseAuth();
      if (auth) await signOut(auth).catch(() => {});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      className="font-utility text-xs uppercase tracking-wide text-charcoal/50 transition-colors hover:text-forest disabled:opacity-60"
    >
      {t("signOut")}
    </button>
  );
}
