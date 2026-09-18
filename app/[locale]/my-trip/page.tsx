import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { TravellerAccess } from "@/components/my-trip/TravellerAccess";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { listRequestsForEmail } from "@/lib/tourRequests/store";
import { travellerFromCookies } from "@/lib/tourRequests/travellerSession";

/* Reading the session cookie makes this request-time work; it must never be
   prerendered or cached, or one traveller's trips would serve another. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your trips",
  robots: { index: false, follow: false },
};

/**
 * Everything this traveller has sent us.
 *
 * Reaching a single trip has always needed its reference, which is printed on
 * the WhatsApp message and easily lost. This is the way in without one: sign
 * in with the address the enquiry was sent from and every trip under it is
 * here.
 *
 * The address comes from the session cookie and from nowhere else. There is
 * no parameter on this page — nothing a visitor can change to see somebody
 * else's trips.
 */
export default async function MyTripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
        <TravellerAccess />
      </Shell>
    );
  }

  const requests = await listRequestsForEmail(email);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-charcoal">{t("tripsTitle")}</h1>
        <p className="mt-2 text-sm text-charcoal/55">{t("tripsSignedIn", { email })}</p>

        {requests.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-stone-dark px-6 py-10 text-center text-sm leading-relaxed text-charcoal/55">
            {t("tripsEmpty")}
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-stone-dark border-y border-stone-dark">
            {requests.map((request) => (
              <li key={request.reference} className="py-4">
                <Link
                  href={`/my-trip/${request.reference}`}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 transition-colors hover:text-forest"
                >
                  <span className="font-utility text-xs uppercase tracking-wide text-forest">
                    {request.reference}
                  </span>
                  <span className="text-sm text-charcoal">
                    {request.payload.dateRange.start && request.payload.dateRange.end
                      ? `${request.payload.dateRange.start} → ${request.payload.dateRange.end}`
                      : t("datesUnset")}
                  </span>
                  <span className="ml-auto rounded-full bg-forest/10 px-3 py-1 font-utility text-[11px] uppercase tracking-wide text-forest">
                    {t(`status.${request.status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="px-4 py-16 sm:px-6 sm:py-24 md:px-10">{children}</main>;
}
