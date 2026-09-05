import { z } from "zod";

export const itineraryOptionSchema = z.object({
  slug: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  description: z.string(),
  keywords: z.array(z.string()).max(6),
  travelMinutesFromPrevious: z.number().nullable(),
  distanceKmFromPrevious: z.number().nullable(),
  suitability: z.string(),
  recommended: z.boolean().default(false),
});

export const itineraryDaySchema = z.object({
  day: z.number(),
  options: z.array(itineraryOptionSchema).min(1).max(5),
});

export const itineraryPlanSchema = z.object({
  days: z.array(itineraryDaySchema).min(1).max(14),
});

export type ItineraryOption = z.infer<typeof itineraryOptionSchema>;
export type ItineraryDay = z.infer<typeof itineraryDaySchema>;
export type ItineraryPlan = z.infer<typeof itineraryPlanSchema>;

export const itineraryRequestSchema = z.object({
  travelers: z.number().int().min(1).max(20),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  interests: z.array(z.string()).max(10),
  accommodation: z.array(z.string()).max(10),
  accommodationNotes: z.string().max(1000),
});

export type ItineraryRequest = z.infer<typeof itineraryRequestSchema>;
