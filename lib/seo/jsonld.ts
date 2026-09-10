import type { Navigation, Profile, Seo, Tour } from "@/lib/content/schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com";

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
