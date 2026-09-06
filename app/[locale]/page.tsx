import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { Link } from "@/i18n/navigation";
import { HomeHero } from "@/components/hero/HomeHero";
import { HomeIntro } from "@/components/home/HomeIntro";
import { GuideIntro } from "@/components/home/GuideIntro";
import { ServicesSection, type Service } from "@/components/home/ServicesSection";
import { PlacesSection } from "@/components/home/PlacesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { DurationSelector } from "@/components/tours/DurationSelector";
import { TestimonialSection } from "@/components/testimonials/TestimonialSection";
import { FinalCTA } from "@/components/whatsapp/FinalCTA";
import { Section } from "@/components/ui/Section";
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
  const services = t.raw("home.services") as Service[];
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
          meta: `${profile.experience} · ${profile.certification}`,
          whatsapp: t("whatsapp.talkToUs"),
        }}
        navigation={navigation}
      />

      <HomeIntro
        eyebrow={t("home.introEyebrow")}
        title={t("home.introTitle")}
        body={t("home.introBody")}
      />

      <ServicesSection
        labels={{
          eyebrow: t("home.servicesEyebrow"),
          title: t("home.servicesTitle"),
          body: t("home.servicesBody"),
        }}
        services={services}
      />

      <GuideIntro
        profile={profile}
        labels={{
          eyebrow: t("nandana.introEyebrow"),
          role: t("home.guideRole"),
          body: t("home.guideBody"),
          cta: t("home.guideCta"),
        }}
      />

      <Section tone="warm">
        <div className="max-w-2xl">
          <p className="font-utility text-xs uppercase tracking-[0.2em] text-forest">
            {t("tours.sectionEyebrow")}
          </p>
          <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl">
            {t("tours.sectionTitle")}
          </h2>
        </div>

        <div className="mt-12">
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

        <Link
          href="/tours"
          className="mt-12 inline-block font-medium text-forest underline underline-offset-8 transition-colors hover:text-forest-dark"
        >
          {t("home.journeysCta")}
        </Link>
      </Section>

      <PlacesSection
        destinations={featuredDestinations}
        labels={{
          eyebrow: t("sriLanka.eyebrow"),
          title: t("sriLanka.title"),
          body: t("sriLanka.body"),
          cta: t("home.placesCta"),
        }}
      />

      <TrustSection
        labels={{
          eyebrow: t("nandana.whyEyebrow"),
          title: t("nandana.whyTitle"),
          note: t("conservation.quote"),
        }}
        points={whyPoints}
      />

      {testimonials.items.length > 0 && (
        <TestimonialSection
          testimonials={testimonials}
          labels={{
            eyebrow: t("testimonials.eyebrow"),
            title: t("testimonials.title"),
            emptyState: t("testimonials.emptyState"),
          }}
        />
      )}

      <FinalCTA
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
