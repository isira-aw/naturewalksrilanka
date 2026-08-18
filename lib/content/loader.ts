import "server-only";
import type { Locale } from "@/i18n/routing";
import { contentSchemas } from "./schema";
import type {
  Profile,
  Tour,
  Destination,
  Activity,
  Testimonials,
  Navigation,
  Seo,
} from "./schema";

type ContentMap = {
  profile: Profile;
  tours: Tour[];
  destinations: Destination[];
  activities: Activity[];
  testimonials: Testimonials;
  navigation: Navigation;
  seo: Seo;
};

const loaders: { [K in keyof ContentMap]: (locale: Locale) => Promise<unknown> } = {
  profile: (locale) => import(`@/content/${locale}/profile.json`).then((m) => m.default),
  tours: (locale) => import(`@/content/${locale}/tours.json`).then((m) => m.default),
  destinations: (locale) => import(`@/content/${locale}/destinations.json`).then((m) => m.default),
  activities: (locale) => import(`@/content/${locale}/activities.json`).then((m) => m.default),
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
  return schema.parse(raw) as ContentMap[K];
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
