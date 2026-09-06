import { z } from "zod";

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

export const destinationSchema = z.object({
  slug: z.string(),
  name: z.string(),
  region: z.string(),
  description: z.string(),
  image: z.string(),
  activities: z.array(z.string()),
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

export const testimonialSchema = z.object({
  author: z.string(),
  country: z.string().optional(),
  quote: z.string(),
  tourSlug: z.string().optional(),
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
  testimonials: testimonialsSchema,
  navigation: navigationSchema,
  seo: seoSchema,
} as const;
