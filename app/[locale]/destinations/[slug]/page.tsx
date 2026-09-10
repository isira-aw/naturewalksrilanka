import type { Metadata } from "next";
import { Photo } from "@/components/ui/Photo";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent, getDestinationBySlug } from "@/lib/content/loader";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowLink, Kicker, Rise, Words } from "@/components/ui/motion";
import { EditorialList } from "@/components/ui/EditorialList";
import { DestinationStory } from "@/components/destinations/DestinationStory";
import { DestinationGallery } from "@/components/destinations/DestinationGallery";
import { PlanCta } from "@/components/whatsapp/PlanCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const destinations = await getContent(locale, "destinations");
    for (const destination of destinations) {
      params.push({ locale, slug: destination.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const l = locale as Locale;
  const [destination, seo] = await Promise.all([
    getDestinationBySlug(l, slug),
    getContent(l, "seo"),
  ]);
  if (!destination) return {};

  const title = `${destination.name} | ${seo.siteName}`;
  return {
    title,
    description: destination.intro ?? destination.description,
    alternates: {
      canonical: `/${locale}/destinations/${slug}`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/destinations/${slug}`])
      ),
    },
    openGraph: {
      title,
      description: destination.intro ?? destination.description,
      images: [destination.heroImage ?? destination.image],
    },
  };
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, destination, activities, tours, navigation] = await Promise.all([
    getTranslations({ locale: l }),
    getDestinationBySlug(l, slug),
    getContent(l, "activities"),
    getContent(l, "tours"),
    getContent(l, "navigation"),
  ]);

  if (!destination) notFound();

  const relatedActivities = destination.activities
    .map((activitySlug) => activities.find((a) => a.slug === activitySlug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const relatedTours = tours.filter((tour) => tour.destinations.includes(slug));
  const gallery = destination.gallery ?? [];
  const wildlife = destination.wildlife ?? [];
  const goodToKnow = destination.goodToKnow ?? [];

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("nav.home"), url: `/${l}` },
          { name: t("sriLanka.eyebrow"), url: `/${l}/destinations` },
          { name: destination.name, url: `/${l}/destinations/${slug}` },
        ])}
      />

      <PageHero
        eyebrow={destination.region}
        title={destination.name}
        lead={destination.description}
        image={{
          src: destination.heroImage ?? destination.image,
          alt: destination.name,
        }}
        /* The facts strip repeats in full further down; the hero shows the two
           a visitor decides on — when to come, and how long to stay. */
        meta={(destination.facts ?? []).slice(0, 2).map((f) => `${f.label}: ${f.value}`)}
      />

      <DestinationStory
        destination={destination}
        labels={{
          eyebrow: t("destinations.story"),
          factsTitle: t("destinations.atAGlance"),
        }}
      />

      <DestinationGallery images={gallery} eyebrow={t("destinations.gallery")} />

      {(wildlife.length > 0 || goodToKnow.length > 0) && (
        <section className="bg-warm-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 sm:px-6 md:grid-cols-12 md:gap-16 md:px-10">
            {wildlife.length > 0 && (
              <div className="md:col-span-7">
                <Kicker>{t("destinations.wildlife")}</Kicker>
                <EditorialList items={wildlife} numbered className="mt-8" />
              </div>
            )}

            {goodToKnow.length > 0 && (
              <div className="md:col-span-5">
                <Kicker>{t("destinations.goodToKnow")}</Kicker>
                <EditorialList items={goodToKnow} className="mt-8" />
              </div>
            )}
          </div>
        </section>
      )}

      {relatedActivities.length > 0 && (
        <section className="bg-stone py-20 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
            <Kicker>{t("destinations.activities")}</Kicker>
            <ul className="mt-10 border-t border-charcoal/15">
              {relatedActivities.map((activity, index) => (
                <li key={activity.slug} className="border-b border-charcoal/15">
                  <div className="grid gap-3 py-7 md:grid-cols-12 md:gap-8">
                    <p className="font-utility text-xs uppercase tracking-[0.2em] text-charcoal/35 md:col-span-1">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="font-display text-xl text-charcoal md:col-span-4 md:text-2xl">
                      {activity.name}
                    </h2>
                    <p className="leading-relaxed text-charcoal/70 md:col-span-7">
                      {activity.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {relatedTours.length > 0 && (
        <section className="bg-warm-white py-20 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
            <Kicker>{t("destinations.journeys")}</Kicker>
            <Words
              text={t("tours.sectionTitle")}
              delay={0.05}
              className="mt-6 max-w-2xl font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
            />

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedTours.map((tour) => (
                <Rise as="li" key={tour.slug} delay={0.05}>
                  <Link href={`/tours/${tour.slug}`} className="group block">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Photo
                        src={tour.heroImage}
                        alt={tour.title}
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                        className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                      <p className="absolute bottom-5 left-5 font-utility text-xs uppercase tracking-[0.2em] text-warm-white/85">
                        {tour.durationDays} {t("tours.daysLabel")}
                      </p>
                    </div>
                    <h3 className="mt-5 font-display text-xl text-charcoal transition-colors group-hover:text-forest">
                      {tour.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-charcoal/65">{tour.tagline}</p>
                  </Link>
                </Rise>
              ))}
            </ul>

            <Rise delay={0.1}>
              <ArrowLink href="/destinations" className="mt-14">
                {t("destinations.backToAll")}
              </ArrowLink>
            </Rise>
          </div>
        </section>
      )}

      <PlanCta
        whatsappNumber={navigation.contact.whatsappNumber}
        labels={{
          eyebrow: t("finalCta.eyebrow"),
          title: t("finalCta.title"),
          subtitle: t("finalCta.subtitle"),
          cta: t("whatsapp.askUs"),
        }}
        secondary={{ href: "/custom-tour", label: t("customTour.start") }}
      />
    </>
  );
}
