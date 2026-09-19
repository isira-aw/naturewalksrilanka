import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getRequest } from "@/lib/tourRequests/store";
import { travellerFromCookies } from "@/lib/tourRequests/travellerSession";
import { TravellerSignIn } from "@/components/my-trip/TravellerSignIn";
import { TripSummary } from "@/components/my-trip/TripSummary";

/* Reads a session cookie and per-visitor data: never prerender or cache it,
   or one traveller's trip would be served to another. */
export const dynamic = "force-dynamic";

/** A private page; it should never appear in a search result. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * One of the traveller's saved enquiries.
 *
 * One way to be let in, and the reference is not it: the reference is short
 * and readable so it can be quoted over the phone, which also makes
 * neighbouring codes guessable. It says *which* trip and proves nothing
 * about *who*. Proving who means a signed-in session as the address on the
 * enquiry, and then every trip filed under that address opens — this one
 * included.
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
        <TravellerSignIn />
      </Shell>
    );
  }

  /* Caught for the same reason as the list page: a throw here is a blank
     500 with nothing for the traveller and nothing for us. */
  let request;
  try {
    request = await getRequest(reference);
  } catch (error) {
    console.error(`Could not read the trip ${reference}:`, error);
    return (
      <Shell>
        <p className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-stone/20 p-6 text-sm leading-relaxed text-charcoal">
          {t("loadFailed")}
        </p>
      </Shell>
    );
  }

  if (!request || request.email !== email) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-stone-dark bg-stone/20 p-6">
          <p className="text-sm leading-relaxed text-charcoal">{t("notYours")}</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/55">
            {t("notYoursHint", { email })}
          </p>
          <Link
            href="/my-trip"
            className="mt-4 inline-block font-utility text-xs uppercase tracking-wide text-forest hover:underline"
          >
            {t("allTrips")}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/my-trip"
          className="font-utility text-xs uppercase tracking-wide text-charcoal/50 transition-colors hover:text-forest"
        >
          &larr; {t("allTrips")}
        </Link>
      </div>
      <TripSummary request={request} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="px-4 py-16 sm:px-6 sm:py-24 md:px-10">{children}</main>;
}
