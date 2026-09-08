import "server-only";
import type { Locale } from "@/i18n/routing";
import { contentSchemas } from "./schema";
import { resolveImage, resolveGallery, imageExists } from "./images";
import type {
  Profile,
  Tour,
  Destination,
  Activity,
  Experience,
  Testimonials,
  Navigation,
  Seo,
} from "./schema";

type ContentMap = {
  profile: Profile;
  tours: Tour[];
  destinations: Destination[];
  activities: Activity[];
  experiences: Experience[];
  testimonials: Testimonials;
  navigation: Navigation;
  seo: Seo;
};

const loaders: { [K in keyof ContentMap]: (locale: Locale) => Promise<unknown> } = {
  profile: (locale) => import(`@/content/${locale}/profile.json`).then((m) => m.default),
  tours: (locale) => import(`@/content/${locale}/tours.json`).then((m) => m.default),
  destinations: (locale) => import(`@/content/${locale}/destinations.json`).then((m) => m.default),
  activities: (locale) => import(`@/content/${locale}/activities.json`).then((m) => m.default),
  experiences: (locale) => import(`@/content/${locale}/experiences.json`).then((m) => m.default),
  testimonials: (locale) => import(`@/content/${locale}/testimonials.json`).then((m) => m.default),
  navigation: (locale) => import(`@/content/${locale}/navigation.json`).then((m) => m.default),
  seo: (locale) => import(`@/content/${locale}/seo.json`).then((m) => m.default),
};

export async function getContent<K extends keyof ContentMap>(
  locale: Locale,
  file: K
): Promise<ContentMap[K]> {
  const raw = await loaders[file](locale);
  const schema = contentSchemas[file];
  const parsed = schema.parse(raw);
  if (file === "destinations") {
    return withResolvedImages(parsed as Destination[]) as ContentMap[K];
  }
  if (file === "experiences") {
    return withResolvedExperienceImages(parsed as Experience[]) as ContentMap[K];
  }
  return parsed as ContentMap[K];
}

/**
 * Destination content names its photographs before they exist (see
 * `public/images/destinations/README.md`): anything not yet supplied falls back
 * to the shared placeholder, and unsupplied gallery frames are dropped, so a
 * half-photographed destination still renders as a finished page.
 */
function withResolvedImages(destinations: Destination[]): Destination[] {
  return destinations.map((destination) => ({
    ...destination,
    image: resolveImage(destination.image),
    heroImage: resolveImage(destination.heroImage ?? destination.image),
    gallery: resolveGallery(destination.gallery),
  }));
}

/**
 * The same arrangement for the prebuilt itineraries: every "what you might
 * see" highlight names its photograph up front (see
 * `public/images/highlights/README.md`), and a highlight whose photograph has
 * not been supplied yet simply renders without one.
 */
function withResolvedExperienceImages(experiences: Experience[]): Experience[] {
  return experiences.map((experience) => ({
    ...experience,
    images: experience.images.map((src) => resolveImage(src)),
    highlights: experience.highlights.map((highlight) => ({
      ...highlight,
      image: imageExists(highlight.image) ? highlight.image : undefined,
    })),
  }));
}

export async function getTourBySlug(locale: Locale, slug: string): Promise<Tour | undefined> {
  const tours = await getContent(locale, "tours");
  return tours.find((t) => t.slug === slug);
}

export async function getDestinationBySlug(
  locale: Locale,
  slug: string
): Promise<Destination | undefined> {
  const destinations = await getContent(locale, "destinations");
  return destinations.find((d) => d.slug === slug);
}
