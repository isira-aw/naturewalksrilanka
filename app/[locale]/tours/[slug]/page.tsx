import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getContent, getTourBySlug } from "@/lib/content/loader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildTourInquiryMessage } from "@/lib/whatsapp/buildMessage";
import { ItineraryTimeline } from "@/components/itinerary/ItineraryTimeline";
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

  const [t, tCommon, tour, destinations, activities, navigation] = await Promise.all([
    getTranslations({ locale: l, namespace: "tours" }),
    getTranslations({ locale: l, namespace: "common" }),
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
          { name: "Home", url: `/${locale}` },
          { name: t("sectionEyebrow"), url: `/${locale}/tours` },
          { name: tour.title, url: `/${locale}/tours/${tour.slug}` },
        ])}
      />

      <section className="relative flex h-[60vh] min-h-[420px] w-full items-end">
        <Image
          src={tour.heroImage}
          alt={tour.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent" />
        <Container className="relative z-10 pb-12">
          <p className="font-utility text-sm uppercase tracking-[0.2em] text-warm-white/80">
            {tour.durationDays} {t("daysLabel")}
          </p>
          <h1 className="mt-3 font-display text-4xl text-warm-white md:text-6xl">
            {tour.title}
          </h1>
          <p className="mt-3 max-w-2xl text-warm-white/85">{tour.tagline}</p>
        </Container>
      </section>

      <section className="bg-warm-white py-16 md:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
            <div>
              <p className="text-lg leading-relaxed text-charcoal/80">{tour.summary}</p>

              {tour.highlights.length > 0 && (
                <div className="mt-10">
                  <p className="font-utility text-xs uppercase tracking-wide text-forest">
                    {t("highlightsTitle")}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {tour.highlights.map((h) => (
                      <li key={h} className="flex gap-2 text-sm text-charcoal/80">
                        <span aria-hidden="true" className="text-forest">
                          —
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-16">
                <ItineraryTimeline
                  days={tour.itinerary}
                  itineraryTitle={t("itineraryTitle")}
                  contentRequiredLabel={tCommon("contentRequired")}
                />
              </div>

              {tour.included.length > 0 && (
                <div className="mt-16">
                  <p className="font-utility text-xs uppercase tracking-wide text-forest">
                    {t("included")}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {tour.included.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-charcoal/80">
                        <span aria-hidden="true" className="text-forest">
                          —
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tour.excluded.length > 0 && (
                <div className="mt-10">
                  <p className="font-utility text-xs uppercase tracking-wide text-forest">
                    {t("excluded")}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {tour.excluded.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-charcoal/80">
                        <span aria-hidden="true" className="text-forest">
                          —
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <aside className="space-y-10">
              {tourDestinations.length > 0 && (
                <div>
                  <p className="font-utility text-xs uppercase tracking-wide text-forest">
                    {t("destinationsTitle")}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {tourDestinations.map((d) => (
                      <li key={d.slug}>
                        <Link
                          href={`/destinations/${d.slug}`}
                          className="text-sm text-charcoal/80 underline-offset-4 hover:text-forest hover:underline"
                        >
                          {d.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tourActivities.length > 0 && (
                <div>
                  <p className="font-utility text-xs uppercase tracking-wide text-forest">
                    {t("activitiesTitle")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tourActivities.map((a) => (
                      <Badge key={a.slug}>{a.name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-stone-dark pt-8">
                <ButtonLink href="/custom-tour" variant="secondary">
                  {t("customizeCta")}
                </ButtonLink>
                <WhatsAppCTA phone={navigation.contact.whatsappNumber} message={whatsappMessage}>
                  {t("whatsappCta")}
                </WhatsAppCTA>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
