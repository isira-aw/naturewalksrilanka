import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent, getDestinationBySlug } from "@/lib/content/loader";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";
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
    description: destination.description,
    alternates: {
      canonical: `/${locale}/destinations/${slug}`,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}/destinations/${slug}`])
      ),
    },
    openGraph: {
      title,
      description: destination.description,
      images: [destination.image],
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

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("nav.home"), url: `/${l}` },
          { name: t("sriLanka.eyebrow"), url: `/${l}/destinations` },
          { name: destination.name, url: `/${l}/destinations/${slug}` },
        ])}
      />

      <section className="relative aspect-[16/9] w-full overflow-hidden md:aspect-[21/9]">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <Container className="pb-10">
            <Badge className="border-warm-white/40 bg-warm-white/10 text-warm-white">
              {destination.region}
            </Badge>
            <h1 className="mt-4 font-display text-4xl leading-tight text-warm-white md:text-5xl">
              {destination.name}
            </h1>
          </Container>
        </div>
      </section>

      <section className="bg-warm-white py-16 md:py-24">
        <Container>
          <p className="max-w-2xl text-lg leading-relaxed text-charcoal/80">
            {destination.description}
          </p>

          {relatedActivities.length > 0 && (
            <div className="mt-14">
              <SectionHeading eyebrow={t("sriLanka.eyebrow")} title={t("tours.activitiesTitle")} />
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {relatedActivities.map((activity) => (
                  <div key={activity.slug} className="border-t-2 border-forest pt-4">
                    <Badge>{activity.name}</Badge>
                    <p className="mt-3 text-charcoal/75">{activity.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatedTours.length > 0 && (
            <div className="mt-14">
              <SectionHeading eyebrow={t("tours.sectionEyebrow")} title={t("nav.journeys")} />
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {relatedTours.map((tour) => (
                  <li key={tour.slug}>
                    <Link
                      href={`/tours/${tour.slug}`}
                      className="block rounded-sm border border-stone-dark bg-warm-white p-6 transition-colors hover:border-forest"
                    >
                      <span className="font-display text-xl text-charcoal">{tour.title}</span>
                      <p className="mt-2 text-sm text-charcoal/70">{tour.tagline}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-14 flex">
            <WhatsAppCTA
              phone={navigation.contact.whatsappNumber}
              message={buildGeneralMessage()}
              variant="secondary"
            >
              {t("whatsapp.askUs")}
            </WhatsAppCTA>
          </div>
        </Container>
      </section>
    </>
  );
}
