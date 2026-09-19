"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * The traveller removing one of their own enquiries.
 *
 * The only thing on this page that destroys anything, so it asks first, and
 * the confirmation is a second press rather than a browser dialogue — the
 * warning can then say what actually goes, which is the enquiry and the
 * whole thread with it.
 *
 * Nobody else has this button. A staff member can move an enquiry to
 * *closed* and can write on the thread, but cannot delete it: a record the
 * business can make disappear is not one either side can rely on. Its author
 * asking for it to be gone is a different thing entirely, and is the reason
 * this exists.
 */
export function DeleteTripButton({ reference }: { reference: string }) {
  const t = useTranslations("myTrip");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/traveller/requests/${encodeURIComponent(reference)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) {
        setError(t("deleteFailed"));
        return;
      }
      /* Back to the list, and re-rendered from the server: this trip is gone
         and the page showing it must not be restored from the cache. */
      router.replace("/my-trip");
      router.refresh();
    } catch {
      setError(t("deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 rounded-2xl border border-stone-dark bg-stone/20 p-5">
      <h2 className="font-display text-lg text-charcoal">{t("deleteTitle")}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/55">
        {confirming ? t("deleteConfirmBody") : t("deleteBody")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="min-h-11 rounded-full bg-clay px-6 text-sm font-medium text-warm-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? t("deleting") : t("deleteConfirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="min-h-11 rounded-full border border-stone-dark px-6 text-sm text-charcoal/70 transition-colors hover:border-forest hover:text-forest disabled:opacity-60"
            >
              {t("deleteCancel")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-11 rounded-full border border-stone-dark px-6 text-sm text-charcoal/70 transition-colors hover:border-clay hover:text-clay"
          >
            {t("deleteTrip")}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-charcoal">
          {error}
        </p>
      )}
    </section>
  );
}
