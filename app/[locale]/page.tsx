import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import type { Activity, Destination } from "@/lib/content/schema";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { IntroStatement } from "@/components/home/IntroStatement";
import { GuideFeature } from "@/components/home/GuideFeature";
import { ServiceRail, type Service } from "@/components/home/ServiceRail";
import { StatsRibbon, type Stat } from "@/components/home/StatsRibbon";
import { DestinationRail } from "@/components/home/DestinationRail";
import { ActivityShowcase, type ActivityCard } from "@/components/home/ActivityShowcase";
import { CustomJourneyInvite } from "@/components/home/CustomJourneyInvite";
import { ReasonsList } from "@/components/home/ReasonsList";
import { JourneyShowcase } from "@/components/home/JourneyShowcase";
import { VoicesSlider } from "@/components/home/VoicesSlider";
import { PlanCta } from "@/components/whatsapp/PlanCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
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
  return buildPageMetadata({
    locale: locale as Locale,
    path: "",
    title: page.title,
    description: page.description,
    seo,
  });
}

/**
 * The destination that stands for each activity on the home page. Slugs, not
 * prose, so this holds in every locale; anything missing from the map (or
 * renamed) falls back to the first destination that lists the activity itself,
 * and an activity no destination claims renders without a link.
 *
 * `gallery` takes the destination's first gallery photograph instead of its
 * card photograph, for the places where the card shot is of something else —
 * Kithulgala's card is an owl, and the river it is actually known for is in
 * its gallery. Gallery frames also carry authored, translated alt text.
 */
const ACTIVITY_PLACE: Record<string, { slug: string; gallery?: boolean }> = {
  birding: { slug: "sinharaja" },
  "wildlife-safari": { slug: "wilpattu" },
  trekking: { slug: "horton-plains" },
  "culture-history": { slug: "anuradhapura" },
  "adventure-sports": { slug: "kithulgala", gallery: true },
  beach: { slug: "mirissa" },
};

function activityCards(activities: Activity[], destinations: Destination[]): ActivityCard[] {
  return activities.map((activity) => {
    const choice = ACTIVITY_PLACE[activity.slug];
    const place =
      destinations.find((d) => d.slug === choice?.slug) ??
      destinations.find((d) => d.activities.includes(activity.slug));

    /* `resolveGallery` has already dropped any frame whose file is not there,
       so an empty gallery falls back to the card photograph. */
    const frame = choice?.gallery ? place?.gallery?.[0] : undefined;

    return {
      slug: activity.slug,
      name: activity.name,
      description: activity.description,
      /* Destination images are resolved by the content loader, so a photograph
         that has not been supplied yet is the shared placeholder rather than a
         hole in the grid. */
      image: frame?.src ?? place?.image ?? "/images/placeholder-destination.jpg",
      imageAlt: frame?.alt ?? (place ? `${place.name}, ${place.region}` : activity.name),
      place: place ? { slug: place.slug, name: place.name } : undefined,
    };
  });
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

  const [t, profile, tours, destinations, activities, testimonials, navigation, seo] =
    await Promise.all([
      getTranslations({ locale: l }),
      getContent(l, "profile"),
      getContent(l, "tours"),
      getContent(l, "destinations"),
      getContent(l, "activities"),
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
  const experiences = activityCards(activities, destinations);

  return (
    <>
      <JsonLd data={buildOrganizationJsonLd({ navigation, seo, locale: l, rating })} />
      <JsonLd data={buildWebsiteJsonLd({ seo, locale: l })} />

      {/* The page is read as a story, in this order: what this island is, why
          this company, who guides you, what we already run, where it happens,
          what you can actually do there, that you can build your own, what we
          arrange around it, and finally how to start the conversation. */}
      <HeroShowcase
        labels={{
          eyebrow: t("hero.eyebrow"),
          titleLine1: t("hero.titleLine1"),
          titleLine2: t("hero.titleLine2"),
          subtitle: t("hero.subtitle"),
          ctaPrimary: t("hero.ctaPrimary"),
          ctaSecondary: t("hero.ctaSecondary"),
          meta: `${profile.experience} · ${profile.certification} · ${t("hero.trustLabel")}`,
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

      <ReasonsList
        labels={{
          eyebrow: t("nandana.whyEyebrow"),
          title: t("nandana.whyTitle"),
          note: t("conservation.quote"),
        }}
        points={whyPoints}
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
          intro: t("tours.homeIntro"),
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

      <ActivityShowcase
        items={experiences}
        labels={{
          eyebrow: t("home.experiencesEyebrow"),
          title: t("home.experiencesTitle"),
          body: t("home.experiencesBody"),
          where: t("home.experiencesWhere"),
        }}
      />

      <CustomJourneyInvite
        labels={{
          eyebrow: t("home.customEyebrow"),
          title: t("home.customTitle"),
          body: t("home.customBody"),
          process: t("home.customProcess"),
          stepsLabel: t("home.customStepsLabel"),
          cta: t("customTour.start"),
        }}
        steps={[
          t("customTour.steps.travelers"),
          t("customTour.steps.dates"),
          t("customTour.steps.interests"),
          t("customTour.steps.accommodation"),
        ]}
        image={{
          src: "/images/story-1.jpg",
          alt: "Birding on a forest trail in Sri Lanka's highlands",
        }}
      />

      <ServiceRail
        labels={{
          eyebrow: t("home.servicesEyebrow"),
          title: t("home.servicesTitle"),
        }}
        services={services}
      />

      {voices.items.length > 0 && (
        <VoicesSlider
          testimonials={voices}
          labels={{
            eyebrow: t("testimonials.eyebrow"),
            title: t("testimonials.title"),
            emptyState: t("testimonials.emptyState"),
            gallery: {
              label: t("gallery.label"),
              close: t("gallery.close"),
              previous: t("gallery.previous"),
              next: t("gallery.next"),
            },
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
