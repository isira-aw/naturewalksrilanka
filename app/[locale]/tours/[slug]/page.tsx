import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent, getTourBySlug } from "@/lib/content/loader";
import { tourGallery } from "@/lib/content/tourGallery";
import { Container } from "@/components/ui/Container";
import { ArrowLink, Kicker } from "@/components/ui/motion";
import { EditorialList } from "@/components/ui/EditorialList";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildTourInquiryMessage } from "@/lib/whatsapp/buildMessage";
import { TourHero } from "@/components/tours/detail/TourHero";
import { TourIntro } from "@/components/tours/detail/TourIntro";
import { TourItinerary } from "@/components/tours/detail/TourItinerary";
import { TourGallery } from "@/components/tours/detail/TourGallery";
import { TourCta } from "@/components/tours/detail/TourCta";
import { TourPageNav } from "@/components/tours/detail/TourPageNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildTouristTripJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

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

  return buildPageMetadata({
    locale: l,
    path: `/tours/${slug}`,
    title: seo.titleTemplate.replace("%s", tour.title),
    description: tour.summary || tour.tagline,
    seo,
    image: tour.heroImage,
    imageAlt: tour.title,
    /* One journey, written up once — an `article` rather than another copy of
       the site's front door. */
    type: "article",
  });
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

  const [t, tCommon, tGallery, tAll, tour, destinations, activities, navigation, seo] =
    await Promise.all([
      getTranslations({ locale: l, namespace: "tours" }),
      getTranslations({ locale: l, namespace: "common" }),
      getTranslations({ locale: l, namespace: "gallery" }),
      getTranslations({ locale: l }),
      getTourBySlug(l, slug),
      getContent(l, "destinations"),
      getContent(l, "activities"),
      getContent(l, "navigation"),
      getContent(l, "seo"),
    ]);

  if (!tour) notFound();

  const tourDestinations = tour.destinations
    .map((destSlug) => destinations.find((d) => d.slug === destSlug))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const tourActivities = tour.activities
    .map((actSlug) => activities.find((a) => a.slug === actSlug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const whatsappMessage = buildTourInquiryMessage(tour.title);

  /* Only the sections this tour actually renders reach the in-page nav, so it
     can never point at an anchor that is not on the page. */
  const navSections = [
    tour.itinerary.length > 0 && { id: "itinerary", label: t("navItinerary") },
    tourGallery.length > 0 && { id: "gallery", label: t("navGallery") },
    { id: "contact", label: t("navContact") },
  ].filter((section): section is { id: string; label: string } => Boolean(section));

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

      <TourPageNav sections={navSections} label={t("onThisPage")} />

      <TourHero
        eyebrow={`${seo.siteName} · ${tour.durationDays} ${t("daysLabel")}`}
        title={tour.title}
        lead={tour.tagline}
        meta={[
          `${tour.durationDays} ${t("daysLabel")}`,
          ...tourActivities.slice(0, 3).map((activity) => activity.name),
        ]}
        image={{ src: tour.heroImage, alt: tour.title }}
        actions={
          <>
            <WhatsAppCTA
              phone={navigation.contact.whatsappNumber}
              message={whatsappMessage}
              variant="secondary"
              size="md"
            >
              {t("whatsappCta")}
            </WhatsAppCTA>
            <ArrowLink href="/custom-tour">{t("customizeCta")}</ArrowLink>
          </>
        }
      />

      <TourIntro
        title={t("introTitle")}
        summary={tour.summary}
        highlights={tour.highlights}
        destinations={tourDestinations.map((destination) => ({
          slug: destination.slug,
          name: destination.name,
          region: destination.region,
        }))}
        labels={{
          highlightsTitle: t("highlightsTitle"),
          destinationsTitle: t("destinationsTitle"),
        }}
      />

      <TourItinerary
        days={tour.itinerary}
        title={t("itineraryTitle")}
        labels={{
          dayLabel: t("dayLabel"),
          birdingHighlights: t("birdingHighlights"),
          wildlifeHighlights: t("wildlifeHighlights"),
          contentRequired: tCommon("contentRequired"),
        }}
      />

      {(tour.included.length > 0 || tour.excluded.length > 0) && (
        <section className="border-t border-line bg-warm-white py-20 md:py-24">
          <Container className="grid gap-14 md:grid-cols-2 md:gap-16">
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
          </Container>
        </section>
      )}

      <TourGallery
        images={tourGallery}
        labels={{
          eyebrow: t("galleryEyebrow"),
          title: t("galleryTitle"),
          lead: t("galleryLead"),
          lightbox: {
            label: tGallery("label"),
            close: tGallery("close"),
            previous: tGallery("previous"),
            next: tGallery("next"),
          },
        }}
      />

      <TourCta
        whatsappNumber={navigation.contact.whatsappNumber}
        whatsappMessage={whatsappMessage}
        email={navigation.contact.email}
        labels={{
          eyebrow: tAll("finalCta.eyebrow"),
          title: tAll("finalCta.title"),
          subtitle: tAll("finalCta.subtitle"),
          whatsappCta: t("whatsappCta"),
          emailCta: t("emailCta"),
          customizeCta: t("customizeCta"),
        }}
      />
    </>
  );
}
