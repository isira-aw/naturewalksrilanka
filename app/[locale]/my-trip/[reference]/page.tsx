import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getRequest } from "@/lib/tourRequests/store";
import { travellerFromCookies } from "@/lib/tourRequests/travellerSession";
import { TravellerAccess } from "@/components/my-trip/TravellerAccess";
import { TripSummary } from "@/components/my-trip/TripSummary";

/* Reads a session cookie and per-visitor data: never prerender or cache it,
   or one traveller's trip would be served to another. */
export const dynamic = "force-dynamic";

/** A private page; it should never appear in a search result. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * One traveller's saved enquiry.
 *
 * Two things must both hold to see it: the reference in the URL, and a
 * verified email-link sign-in as the address on that enquiry. The reference
 * alone is deliberately not enough — it is short and readable so it can be
 * quoted over the phone, which also makes neighbouring codes guessable.
 *
 * A reference that does not exist and one belonging to somebody else give
 * the same answer, so the page cannot be used to discover which references
 * are real.
 */
export default async function MyTripPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("myTrip");

  if (!isFirebaseConfigured()) {
    return (
      <Shell>
        <p className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-stone/20 p-6 text-sm leading-relaxed text-charcoal">
          {t("unavailable")}
        </p>
      </Shell>
    );
  }

  const email = await travellerFromCookies();
  if (!email) {
    return (
      <Shell>
        <TravellerAccess reference={reference} />
      </Shell>
    );
  }

  const request = await getRequest(reference);
  if (!request || request.email !== email) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-stone/20 p-6">
          <p className="text-sm leading-relaxed text-charcoal">{t("notYours")}</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/55">
            {t("notYoursHint", { email })}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TripSummary request={request} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="px-4 py-16 sm:px-6 sm:py-24 md:px-10">{children}</main>;
}
