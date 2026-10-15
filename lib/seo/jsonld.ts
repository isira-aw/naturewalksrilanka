import type { Destination, Faq, Navigation, Profile, Seo, Tour } from "@/lib/content/schema";
import { locales } from "@/i18n/routing";
import { SITE_URL, absoluteUrl } from "./site";

/**
 * Stable identifiers for the entities that exist once on the whole site, not
 * once per language. Every block below refers to the others by `@id` instead of
 * repeating them, which is what turns separate snippets into one connected
 * graph: the agency *founded by* a person who *guides for* that agency,
 * publishing a website, offering these trips. Search engines and language
 * models resolve an entity far more reliably from a graph than from loose,
 * unlinked blocks.
 *
 * The fragment, not a page URL, so the id never changes when a page moves.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const FOUNDER_ID = `${SITE_URL}/#founder`;

const COUNTRY = { "@type": "Country", name: "Sri Lanka" } as const;

/** Drops empty strings and the `CONTENT_REQUIRED` marker content files use for "not supplied yet". */
function isSupplied(text: string | undefined): text is string {
  return Boolean(text && text.trim() && text.trim() !== "CONTENT_REQUIRED");
}

export function buildOrganizationJsonLd({
  navigation,
  seo,
  profile,
  locale,
  rating,
}: {
  navigation: Navigation;
  seo: Seo;
  profile?: Profile;
  locale: string;
  /* Only ever real, approved reviews — see `lib/reviews/published.ts`, which
     withholds an aggregate below three of them. Marking up ratings that are
     not genuine is a manual-action offence, not merely bad manners. */
  rating?: { ratingValue: number; reviewCount: number } | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": ORGANIZATION_ID,
    name: seo.siteName,
    url: `${SITE_URL}/${locale}`,
    description: seo.defaultDescription,
    image: absoluteUrl(seo.ogImage),
    email: navigation.contact.email,
    telephone: navigation.contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: navigation.contact.address,
      addressCountry: "LK",
    },
    /* Where the business works, which is not where it is based: the trips run
       across the island, and "tour operator in Sri Lanka" is the question this
       answers for a search or a model that has no map to look at. */
    areaServed: COUNTRY,
    ...(profile
      ? {
          /* Facts from the profile, which is where the business states them. */
          foundingDate: "2017",
          founder: { "@id": FOUNDER_ID },
          knowsAbout: profile.specialties,
        }
      : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: navigation.contact.phone,
      email: navigation.contact.email,
      areaServed: "Worldwide",
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
    "@id": WEBSITE_ID,
    name: seo.siteName,
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
    /* The same site in every language — `inLanguage` above is only this page's. */
    availableLanguage: [...locales],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function buildPersonJsonLd({
  profile,
  navigation,
  locale,
}: {
  profile: Profile;
  navigation?: Navigation;
  locale: string;
}) {
  const sameAs = navigation ? Object.values(navigation.social).filter(Boolean) : [];
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": FOUNDER_ID,
    name: profile.name,
    description: profile.philosophy,
    jobTitle: "Tour Guide",
    image: absoluteUrl(profile.portraitImage),
    worksFor: { "@id": ORGANIZATION_ID },
    knowsAbout: profile.specialties,
    /* The certification is the profile's own wording; the issuer is a proper
       noun and is the same in every language. */
    ...(isSupplied(profile.certification)
      ? {
          hasCredential: {
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "certification",
            name: profile.certification,
            recognizedBy: { "@type": "Organization", name: "Sri Lanka Tourism Board" },
          },
        }
      : {}),
    /* Only when a language list has actually been confirmed — it is empty in
       the content file until the business supplies it. */
    ...(profile.languages.filter(isSupplied).length
      ? { knowsLanguage: profile.languages.filter(isSupplied) }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
    url: `${SITE_URL}/${locale}/about-nandana`,
    mainEntityOfPage: `${SITE_URL}/${locale}/about-nandana`,
  };
}

export function buildTouristTripJsonLd({ tour, locale }: { tour: Tour; locale: string }) {
  const url = `${SITE_URL}/${locale}/tours/${tour.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": `${url}#trip`,
    name: tour.title,
    description: tour.summary,
    url,
    inLanguage: locale,
    image: absoluteUrl(tour.heroImage),
    provider: { "@id": ORGANIZATION_ID },
    /* The day-by-day plan as an ordered list. Position carries the sequence,
       which a plain array of attractions did not: a model asked "what happens
       on day 3?" can answer it from this without parsing the page. */
    itinerary: {
      "@type": "ItemList",
      numberOfItems: tour.itinerary.length,
      itemListElement: tour.itinerary.map((day, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${day.day}: ${day.title}`,
        description: day.description,
      })),
    },
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
  const hero = destination.heroImage ?? destination.image;
  /* The hero first, then the gallery, without repeating the hero. */
  const images = [hero, ...(destination.gallery?.map((g) => g.src) ?? [])]
    .filter((src, index, all): src is string => Boolean(src) && all.indexOf(src) === index)
    .map(absoluteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: destination.name,
    description: destination.intro ?? destination.description,
    url: `${SITE_URL}/${locale}/destinations/${destination.slug}`,
    ...(images.length ? { image: images } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: "LK",
      ...(destination.region ? { addressRegion: destination.region } : {}),
    },
    containedInPlace: COUNTRY,
    /* What a visitor can do here, from the destination's own activity list. */
    ...(destination.activities.length
      ? { touristType: destination.activities }
      : {}),
    /* The place is not the seller, so the operator is named as the page's
       publisher rather than folded into the attraction itself. */
    isPartOf: { "@type": "WebSite", "@id": WEBSITE_ID, name: seo.siteName, url: `${SITE_URL}/${locale}` },
  };
}

/**
 * Questions and answers, for the page that shows them.
 *
 * Google now shows FAQ rich results only for a few authoritative sites, so
 * this is not here for a rich result. It is here because a question with its
 * answer, marked as such, is the unit a language model quotes from — and the
 * unit a voice assistant reads out.
 *
 * Items still marked `contentRequired` are skipped: they carry a placeholder
 * where the operator has not yet written the answer, and marking up a
 * placeholder would put "CONTENT_REQUIRED" in front of every crawler. The
 * markup must match what the page shows, and the page does not show those
 * answers either. Returns `null` when nothing is left to mark up.
 */
export function buildFaqJsonLd({ faq }: { faq: Faq }) {
  const answered = faq.items.filter(
    (item) => !item.contentRequired && isSupplied(item.question) && isSupplied(item.answer),
  );
  if (!answered.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: answered.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
