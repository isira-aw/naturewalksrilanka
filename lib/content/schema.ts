import { z } from "zod";
import { ITINERARY_CATEGORY_IDS } from "@/lib/itineraries/categories";
import { PROVINCE_IDS } from "@/lib/geo/sriLanka";

export const profileSchema = z.object({
  name: z.string(),
  experience: z.string(),
  languages: z.array(z.string()),
  certification: z.string(),
  philosophy: z.string(),
  story: z.string(),
  specialties: z.array(z.string()),
  stats: z.array(z.object({ value: z.string(), label: z.string() })),
  portraitImage: z.string(),
  _note: z.string().optional(),
  _reviewStatus: z.string().optional(),
});
export type Profile = z.infer<typeof profileSchema>;

export const itineraryDaySchema = z.object({
  day: z.string(),
  location: z.string(),
  title: z.string(),
  description: z.string(),
  highlights: z.array(z.string()).optional(),
  contentRequired: z.boolean().optional(),
  note: z.string().optional(),
});
export type ItineraryDay = z.infer<typeof itineraryDaySchema>;

export const tourSchema = z.object({
  slug: z.string(),
  durationDays: z.number(),
  title: z.string(),
  tagline: z.string(),
  summary: z.string(),
  heroImage: z.string(),
  highlights: z.array(z.string()),
  destinations: z.array(z.string()),
  activities: z.array(z.string()),
  itinerary: z.array(itineraryDaySchema),
  included: z.array(z.string()),
  excluded: z.array(z.string()),
  _note: z.string().optional(),
  _reviewStatus: z.string().optional(),
});
export type Tour = z.infer<typeof tourSchema>;
export const toursSchema = z.array(tourSchema);

/** One photograph in a destination's gallery. */
export const destinationImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  /** Shown under the photograph in the gallery; omit for a silent image. */
  caption: z.string().optional(),
});
export type DestinationImage = z.infer<typeof destinationImageSchema>;

/** A titled block of prose on a destination page. */
export const destinationSectionSchema = z.object({
  title: z.string(),
  body: z.string(),
});

/** A short label/value pair for the facts strip (season, time needed, terrain). */
export const destinationFactSchema = z.object({
  label: z.string(),
  value: z.string(),
});

/**
 * Everything past `activities` is optional on purpose: the English files carry
 * the full write-up, and the other locales still validate while they hold only
 * the short description. A destination page renders whatever is present.
 */
export const destinationSchema = z.object({
  slug: z.string(),
  name: z.string(),
  region: z.string(),
  description: z.string(),
  image: z.string(),
  activities: z.array(z.string()),
  /** Full-bleed photograph at the top of the page; falls back to `image`. */
  heroImage: z.string().optional(),
  gallery: z.array(destinationImageSchema).optional(),
  /** The opening paragraph — what this place actually is. */
  intro: z.string().optional(),
  sections: z.array(destinationSectionSchema).optional(),
  /** Species and sights a visitor can reasonably hope to see here. */
  wildlife: z.array(z.string()).optional(),
  facts: z.array(destinationFactSchema).optional(),
  goodToKnow: z.array(z.string()).optional(),
  _note: z.string().optional(),
  _reviewStatus: z.string().optional(),
});
export type Destination = z.infer<typeof destinationSchema>;
export const destinationsSchema = z.array(destinationSchema);

export const activitySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  _reviewStatus: z.string().optional(),
});
export type Activity = z.infer<typeof activitySchema>;
export const activitiesSchema = z.array(activitySchema);

/**
 * A prebuilt itinerary idea, tied to exactly one interest category. The wizard
 * shows the ones matching whatever categories the traveller ticks, so an idea
 * must never straddle two categories — author a separate entry per category
 * rather than tagging one entry "wildlife + photography".
 */
export const experienceHighlightSchema = z.object({
  name: z.string(),
  note: z.string().optional(),
  /** Optional per-highlight photo (e.g. the bird itself); rendered when present. */
  image: z.string().optional(),
});
export type ExperienceHighlight = z.infer<typeof experienceHighlightSchema>;

export const experienceSchema = z.object({
  slug: z.string(),
  /* The five categories live in lib/itineraries/categories.ts, so the admin
     form, the wizard step and this schema can never disagree about the list. */
  category: z.enum(ITINERARY_CATEGORY_IDS),
  title: z.string(),
  location: z.string(),
  /**
   * Which of Sri Lanka's nine provinces this happens in. The journey plan
   * needs somewhere to put the itinerary on the map, and the province centre
   * is the answer whenever `location` names nowhere it recognises.
   */
  province: z.enum(PROVINCE_IDS).optional(),
  /** Season the idea is written for, e.g. "December – April". */
  bestTime: z.string(),
  /** How long the idea runs, e.g. "2 days". */
  duration: z.string(),
  /** One line, shown on the card in the wizard. */
  summary: z.string(),
  /** Full text, shown only inside the dialog. */
  description: z.string(),
  images: z.array(z.string()).min(1),
  highlights: z.array(experienceHighlightSchema),
  contentRequired: z.boolean().optional(),
  _note: z.string().optional(),
  _reviewStatus: z.string().optional(),
});
export type Experience = z.infer<typeof experienceSchema>;
export const experiencesSchema = z.array(experienceSchema);

export const testimonialSchema = z.object({
  author: z.string(),
  country: z.string().optional(),
  quote: z.string(),
  tourSlug: z.string().optional(),
  /* Optional because the hand-written entries in `content/` predate reviews
     and have no star rating; only ones submitted through the review form
     carry it. */
  rating: z.number().int().min(1).max(5).optional(),
});
export const testimonialsSchema = z.object({
  _reviewStatus: z.string().optional(),
  _note: z.string().optional(),
  items: z.array(testimonialSchema),
});
export type Testimonials = z.infer<typeof testimonialsSchema>;

export const navLinkSchema = z.object({ label: z.string(), href: z.string() });
export const navigationSchema = z.object({
  main: z.array(navLinkSchema),
  primaryCta: navLinkSchema,
  footerLinks: z.array(navLinkSchema),
  social: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
  }),
  contact: z.object({
    email: z.string(),
    phone: z.string(),
    whatsappNumber: z.string(),
    address: z.string(),
  }),
  _reviewStatus: z.string().optional(),
});
export type Navigation = z.infer<typeof navigationSchema>;

export const seoPageSchema = z.object({ title: z.string(), description: z.string() });
export const seoSchema = z.object({
  siteName: z.string(),
  titleTemplate: z.string(),
  defaultTitle: z.string(),
  defaultDescription: z.string(),
  ogImage: z.string(),
  keywords: z.array(z.string()),
  pages: z.record(z.string(), seoPageSchema),
  _reviewStatus: z.string().optional(),
});
export type Seo = z.infer<typeof seoSchema>;

export const contentSchemas = {
  profile: profileSchema,
  tours: toursSchema,
  destinations: destinationsSchema,
  activities: activitiesSchema,
  experiences: experiencesSchema,
  testimonials: testimonialsSchema,
  navigation: navigationSchema,
  seo: seoSchema,
} as const;
