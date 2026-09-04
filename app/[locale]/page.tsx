import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { HomeHero } from "@/components/hero/HomeHero";
import { NandanaIntro } from "@/components/nandana/NandanaIntro";
import { WhyNandana } from "@/components/nandana/WhyNandana";
import { SriLankaStory } from "@/components/destinations/SriLankaStory";
import { DurationSelector } from "@/components/tours/DurationSelector";
import { CustomTourTeaser } from "@/components/custom-tour/CustomTourTeaser";
import { AvailabilityTeaser } from "@/components/calendar/AvailabilityTeaser";
import { DestinationGrid } from "@/components/destinations/DestinationGrid";
import { ConservationSection } from "@/components/nandana/ConservationSection";
import { TestimonialSection } from "@/components/testimonials/TestimonialSection";
import { FinalCTA } from "@/components/whatsapp/FinalCTA";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/jsonld";

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

  const whyPoints = t.raw("nandana.whyPoints") as { title: string; description: string }[];
  const featuredDestinations = destinations.slice(0, 8);

  return (
    <>
      <JsonLd data={buildOrganizationJsonLd({ navigation, seo, locale: l })} />
      <JsonLd data={buildWebsiteJsonLd({ seo, locale: l })} />

      <HomeHero
        labels={{
          eyebrow: t("hero.eyebrow"),
          titleLine1: t("hero.titleLine1"),
          titleLine2: t("hero.titleLine2"),
          subtitle: t("hero.subtitle"),
          ctaPrimary: t("hero.ctaPrimary"),
          ctaSecondary: t("hero.ctaSecondary"),
        }}
        navigation={navigation}
      />

      <NandanaIntro profile={profile} eyebrow={t("nandana.introEyebrow")} title={t("nandana.introTitle")} />

      <WhyNandana
        profile={profile}
        eyebrow={t("nandana.whyEyebrow")}
        title={t("nandana.whyTitle")}
        points={whyPoints}
      />

      <SriLankaStory
        labels={{
          eyebrow: t("sriLanka.eyebrow"),
          title: t("sriLanka.title"),
          body: t("sriLanka.body"),
          cta: t("sriLanka.cta"),
        }}
      />

      <section className="bg-warm-white py-4 pb-24 pt-16 md:pb-32 md:pt-20">
        <Container>
          <SectionHeading eyebrow={t("tours.sectionEyebrow")} title={t("tours.sectionTitle")} />
          <div className="mt-14">
            <DurationSelector
              tours={tours}
              labels={{
                cta: t("tours.cta"),
                daysLabel: t("tours.daysLabel"),
                highlightsTitle: t("tours.highlightsTitle"),
                custom: t("tours.custom"),
              }}
            />
          </div>
        </Container>
      </section>

      <CustomTourTeaser
        labels={{
          eyebrow: t("customTour.eyebrow"),
          titleLine1: t("customTour.titleLine1"),
          titleLine2: t("customTour.titleLine2"),
          intro: t("customTour.intro"),
          start: t("customTour.start"),
        }}
      />

      <AvailabilityTeaser
        labels={{
          eyebrow: t("availability.eyebrow"),
          title: t("availability.title"),
          subtitle: t("availability.subtitle"),
          cta: t("availability.cta"),
        }}
      />

      <section className="bg-warm-white py-4 pb-24 pt-16 md:pb-32 md:pt-20">
        <Container>
          <SectionHeading eyebrow={t("sriLanka.eyebrow")} title={t("tours.destinationsTitle")} />
          <div className="mt-14">
            <DestinationGrid destinations={featuredDestinations} />
          </div>
        </Container>
      </section>

      <ConservationSection
        labels={{
          eyebrow: t("conservation.eyebrow"),
          title: t("conservation.title"),
          quote: t("conservation.quote"),
        }}
      />

      <TestimonialSection
        testimonials={testimonials}
        labels={{
          eyebrow: t("testimonials.eyebrow"),
          title: t("testimonials.title"),
          emptyState: t("testimonials.emptyState"),
        }}
      />

      <FinalCTA
        whatsappNumber={navigation.contact.whatsappNumber}
        labels={{
          eyebrow: t("finalCta.eyebrow"),
          title: t("finalCta.title"),
          subtitle: t("finalCta.subtitle"),
          cta: t("whatsapp.finalCta"),
        }}
      />
    </>
  );
}
