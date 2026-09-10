import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { IntroStatement } from "@/components/home/IntroStatement";
import { GuideFeature } from "@/components/home/GuideFeature";
import { ServiceRail, type Service } from "@/components/home/ServiceRail";
import { StatsRibbon, type Stat } from "@/components/home/StatsRibbon";
import { DestinationRail } from "@/components/home/DestinationRail";
import { ReasonsList } from "@/components/home/ReasonsList";
import { JourneyShowcase } from "@/components/home/JourneyShowcase";
import { VoicesSlider } from "@/components/home/VoicesSlider";
import { PlanCta } from "@/components/whatsapp/PlanCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/jsonld";
import { aggregateRating, publishedTestimonials } from "@/lib/reviews/published";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const seo = await getContent(locale as Locale, "seo");
  const page = seo.pages.home;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      images: [seo.ogImage],
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;

  const [t, profile, tours, destinations, testimonials, navigation, seo] = await Promise.all([
    getTranslations({ locale: l }),
    getContent(l, "profile"),
    getContent(l, "tours"),
    getContent(l, "destinations"),
    getContent(l, "testimonials"),
    getContent(l, "navigation"),
    getContent(l, "seo"),
  ]);

  /* Approved reviews merged in alongside anything hand-written in
     `content/`; a Firestore failure degrades to the static list. */
  const voices = await publishedTestimonials(testimonials, l);
  const rating = aggregateRating(voices);

  const whyPoints = t.raw("nandana.whyPoints") as { title: string; description: string }[];
  const services = t.raw("home.services") as Service[];
  const stats = t.raw("home.stats") as Stat[];
  const featuredDestinations = destinations.slice(0, 8);

  return (
    <>
      <JsonLd data={buildOrganizationJsonLd({ navigation, seo, locale: l, rating })} />
      <JsonLd data={buildWebsiteJsonLd({ seo, locale: l })} />

      <HeroShowcase
        labels={{
          eyebrow: t("hero.eyebrow"),
          titleLine1: t("hero.titleLine1"),
          titleLine2: t("hero.titleLine2"),
          subtitle: t("hero.subtitle"),
          ctaPrimary: t("hero.ctaPrimary"),
          ctaSecondary: t("hero.ctaSecondary"),
          meta: `${profile.experience} · ${profile.certification}`,
          whatsapp: t("whatsapp.talkToUs"),
        }}
        navigation={navigation}
      />

      <IntroStatement
        eyebrow={t("home.introEyebrow")}
        title={t("home.introTitle")}
        body={t("home.introBody")}
      />

      <StatsRibbon stats={stats} />

      <ServiceRail
        labels={{
          eyebrow: t("home.servicesEyebrow"),
          title: t("home.servicesTitle"),
        }}
        services={services}
      />

      <GuideFeature
        profile={profile}
        labels={{
          eyebrow: t("nandana.introEyebrow"),
          role: t("home.guideRole"),
          body: t("home.guideBody"),
          cta: t("home.guideCta"),
        }}
      />

      <JourneyShowcase
        tours={tours}
        labels={{
          eyebrow: t("tours.sectionEyebrow"),
          title: t("tours.sectionTitle"),
          cta: t("tours.cta"),
          daysLabel: t("tours.daysLabel"),
          highlightsTitle: t("tours.highlightsTitle"),
          custom: t("tours.custom"),
          allCta: t("home.journeysCta"),
        }}
      />

      <DestinationRail
        destinations={featuredDestinations}
        labels={{
          eyebrow: t("sriLanka.eyebrow"),
          title: t("sriLanka.title"),
          body: t("sriLanka.body"),
          cta: t("home.placesCta"),
        }}
      />

      <ReasonsList
        labels={{
          eyebrow: t("nandana.whyEyebrow"),
          title: t("nandana.whyTitle"),
          note: t("conservation.quote"),
        }}
        points={whyPoints}
      />

      {voices.items.length > 0 && (
        <VoicesSlider
          testimonials={voices}
          labels={{
            eyebrow: t("testimonials.eyebrow"),
            title: t("testimonials.title"),
            emptyState: t("testimonials.emptyState"),
          }}
        />
      )}

      <PlanCta
        whatsappNumber={navigation.contact.whatsappNumber}
        labels={{
          eyebrow: t("finalCta.eyebrow"),
          title: t("finalCta.title"),
          subtitle: t("finalCta.subtitle"),
          cta: t("whatsapp.finalCta"),
        }}
        secondary={{ href: "/custom-tour", label: t("customTour.start") }}
      />

    </>
  );
}
