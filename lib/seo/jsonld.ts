import type { Destination, Navigation, Profile, Seo, Tour } from "@/lib/content/schema";
import { SITE_URL, absoluteUrl } from "./site";

export function buildOrganizationJsonLd({
  navigation,
  seo,
  locale,
  rating,
}: {
  navigation: Navigation;
  seo: Seo;
  locale: string;
  /* Only ever real, approved reviews — see `lib/reviews/published.ts`, which
     withholds an aggregate below three of them. Marking up ratings that are
     not genuine is a manual-action offence, not merely bad manners. */
  rating?: { ratingValue: number; reviewCount: number } | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: seo.siteName,
    url: `${SITE_URL}/${locale}`,
    email: navigation.contact.email,
    telephone: navigation.contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: navigation.contact.address,
      addressCountry: "LK",
    },
    sameAs: Object.values(navigation.social).filter(Boolean),
    ...(rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.ratingValue,
            reviewCount: rating.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function buildWebsiteJsonLd({ seo, locale }: { seo: Seo; locale: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seo.siteName,
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
  };
}

export function buildPersonJsonLd({ profile, locale }: { profile: Profile; locale: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    description: profile.philosophy,
    jobTitle: "Tour Guide",
    knowsAbout: profile.specialties,
    url: `${SITE_URL}/${locale}/about-nandana`,
  };
}

export function buildTouristTripJsonLd({ tour, locale }: { tour: Tour; locale: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.title,
    description: tour.summary,
    url: `${SITE_URL}/${locale}/tours/${tour.slug}`,
    itinerary: tour.itinerary.map((day) => ({
      "@type": "TouristAttraction",
      name: day.location,
      description: day.description,
    })),
  };
}

export function buildBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * A destination page describes a place, not a product, so `TouristAttraction`
 * is the type search engines look for — it is what makes a destination
 * eligible for a rich result rather than a plain blue link.
 *
 * Only fields the content file actually holds are emitted. Marking up an
 * address or an opening time we have not been told is how structured data
 * earns a manual action, so a destination with nothing but a name and a
 * description produces exactly that and no more.
 */
export function buildTouristAttractionJsonLd({
  destination,
  seo,
  locale,
}: {
  destination: Destination;
  seo: Seo;
  locale: string;
}) {
  const image = destination.heroImage ?? destination.image;
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: destination.name,
    description: destination.intro ?? destination.description,
    url: `${SITE_URL}/${locale}/destinations/${destination.slug}`,
    ...(image ? { image: absoluteUrl(image) } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: "LK",
      ...(destination.region ? { addressRegion: destination.region } : {}),
    },
    /* The place is not the seller, so the operator is named as the page's
       publisher rather than folded into the attraction itself. */
    isPartOf: { "@type": "WebSite", name: seo.siteName, url: `${SITE_URL}/${locale}` },
  };
}
