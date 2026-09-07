import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getContent, getTourBySlug } from "@/lib/content/loader";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowLink, Kicker, Rise } from "@/components/ui/motion";
import { EditorialList } from "@/components/ui/EditorialList";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildTourInquiryMessage } from "@/lib/whatsapp/buildMessage";
import { ItineraryTimeline } from "@/components/itinerary/ItineraryTimeline";
import { PlanCta } from "@/components/whatsapp/PlanCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildTouristTripJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

export async function generateStaticParams() {
  const tours = await getContent("en" as Locale, "tours");
  return routing.locales.flatMap((locale) =>
    tours.map((tour) => ({ locale, slug: tour.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const l = locale as Locale;
  const [seo, tour] = await Promise.all([getContent(l, "seo"), getTourBySlug(l, slug)]);
  if (!tour) return {};

  const title = seo.titleTemplate.replace("%s", tour.title);
  const description = tour.summary || tour.tagline;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/tours/${slug}`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/tours/${slug}`])
      ),
    },
    openGraph: {
      title,
      description,
      images: [tour.heroImage],
    },
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, tCommon, tAll, tour, destinations, activities, navigation] = await Promise.all([
    getTranslations({ locale: l, namespace: "tours" }),
    getTranslations({ locale: l, namespace: "common" }),
    getTranslations({ locale: l }),
    getTourBySlug(l, slug),
    getContent(l, "destinations"),
    getContent(l, "activities"),
    getContent(l, "navigation"),
  ]);

  if (!tour) notFound();

  const tourDestinations = tour.destinations
    .map((destSlug) => destinations.find((d) => d.slug === destSlug))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const tourActivities = tour.activities
    .map((actSlug) => activities.find((a) => a.slug === actSlug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const whatsappMessage = buildTourInquiryMessage(tour.title);

  return (
    <>
      <JsonLd data={buildTouristTripJsonLd({ tour, locale: l })} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: tAll("nav.home"), url: `/${locale}` },
          { name: t("sectionEyebrow"), url: `/${locale}/tours` },
          { name: tour.title, url: `/${locale}/tours/${tour.slug}` },
        ])}
      />

      <PageHero
        eyebrow={`${tour.durationDays} ${t("daysLabel")}`}
        title={tour.title}
        lead={tour.tagline}
        image={{ src: tour.heroImage, alt: tour.title }}
        meta={[
          `${tourDestinations.length} ${t("destinationsTitle")}`,
          ...tourActivities.slice(0, 3).map((activity) => activity.name),
        ]}
        actions={
          <>
            <WhatsAppCTA
              phone={navigation.contact.whatsappNumber}
              message={whatsappMessage}
              variant="inverted"
              size="lg"
            >
              {t("whatsappCta")}
            </WhatsAppCTA>
            <ArrowLink href="/custom-tour" tone="light">
              {t("customizeCta")}
            </ArrowLink>
          </>
        }
      />

      {/* Summary and the route at a glance, before the day-by-day detail. */}
      <section className="bg-warm-white py-20 md:py-28">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 md:grid-cols-12 md:gap-16 md:px-10">
          <div className="md:col-span-7">
            <Kicker>{t("sectionEyebrow")}</Kicker>
            <Rise delay={0.1}>
              <p className="mt-8 text-xl leading-relaxed text-charcoal/80 md:text-2xl md:leading-[1.5]">
                {tour.summary}
              </p>
            </Rise>

            {tour.highlights.length > 0 && (
              <div className="mt-12">
                <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
                  {t("highlightsTitle")}
                </p>
                <EditorialList items={tour.highlights} numbered className="mt-6" />
              </div>
            )}
          </div>

          <div className="md:col-span-5 md:pt-4">
            {tourDestinations.length > 0 && (
              <div>
                <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
                  {t("destinationsTitle")}
                </p>
                <ul className="mt-6 border-t border-charcoal/15">
                  {tourDestinations.map((destination) => (
                    <li key={destination.slug} className="border-b border-charcoal/15">
                      <Link
                        href={`/destinations/${destination.slug}`}
                        className="group flex items-baseline justify-between gap-6 py-4"
                      >
                        <span className="text-charcoal/80 transition-colors group-hover:text-forest">
                          {destination.name}
                        </span>
                        <span className="font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/45 transition-colors group-hover:text-forest">
                          {destination.region}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tourActivities.length > 0 && (
              <div className="mt-12">
                <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
                  {t("activitiesTitle")}
                </p>
                <EditorialList
                  items={tourActivities.map((activity) => activity.name)}
                  className="mt-6"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-stone py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
          <ItineraryTimeline
            days={tour.itinerary}
            itineraryTitle={t("itineraryTitle")}
            contentRequiredLabel={tCommon("contentRequired")}
          />
        </div>
      </section>

      {(tour.included.length > 0 || tour.excluded.length > 0) && (
        <section className="bg-warm-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 sm:px-6 md:grid-cols-2 md:gap-16 md:px-10">
            {tour.included.length > 0 && (
              <div>
                <Kicker>{t("included")}</Kicker>
                <EditorialList items={tour.included} className="mt-8" />
              </div>
            )}
            {tour.excluded.length > 0 && (
              <div>
                <Kicker>{t("excluded")}</Kicker>
                <EditorialList items={tour.excluded} className="mt-8" />
              </div>
            )}
          </div>
        </section>
      )}

      <PlanCta
        whatsappNumber={navigation.contact.whatsappNumber}
        labels={{
          eyebrow: tAll("finalCta.eyebrow"),
          title: tAll("finalCta.title"),
          subtitle: tAll("finalCta.subtitle"),
          cta: t("whatsappCta"),
        }}
        secondary={{ href: "/tours", label: t("sectionEyebrow") }}
      />
    </>
  );
}
