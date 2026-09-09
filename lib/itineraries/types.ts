import { z } from "zod";
import { ITINERARY_CATEGORY_IDS, type ItineraryCategory } from "./categories";
import { PROVINCE_IDS, type ProvinceId } from "@/lib/geo/sriLanka";
import { locales, type Locale } from "@/i18n/routing";

/**
 * The record the admin page owns.
 *
 * There is no database behind this yet, so the shape is written as if there
 * already were one: a stable `id` that survives every edit, timestamps, an
 * explicit `schemaVersion` on the envelope, and translations kept as their own
 * sub-records rather than as parallel files. Moving to a real backend means
 * writing one adapter (see `store.ts`) that reads and writes these same
 * records — no field has to be invented or thrown away at that point.
 */

/** One "what you might see" entry. Only the name is required. */
export const highlightSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  /** A base64 data URL, or a path under `public/`. */
  image: z.string().optional(),
});
export type ItineraryHighlight = z.infer<typeof highlightSchema>;

/** The fields translation actually has to carry — everything else is language-neutral. */
export const translatableSchema = z.object({
  head: z.string(),
  bestTime: z.string().optional(),
  suggestedLength: z.string().optional(),
  content1: z.string(),
  content2: z.string().optional(),
  highlights: z.array(z.object({ name: z.string(), description: z.string().optional() })),
});
export type TranslatableFields = z.infer<typeof translatableSchema>;

export const translationStatusSchema = z.enum(["missing", "pending", "ready", "failed"]);
export type TranslationStatus = z.infer<typeof translationStatusSchema>;

export const translationSchema = z.object({
  status: translationStatusSchema,
  fields: translatableSchema.optional(),
  translatedAt: z.string().optional(),
  /** Why the last attempt failed, so the admin knows whether retrying helps. */
  error: z.string().optional(),
});
export type ItineraryTranslation = z.infer<typeof translationSchema>;

export const itineraryRecordSchema = z.object({
  /** Stable across every edit — the key a real database would key on. */
  id: z.string().min(1),
  /** Derived from the head on first save; the wizard and documents key on it. */
  slug: z.string().min(1),
  category: z.enum(ITINERARY_CATEGORY_IDS),
  province: z.enum(PROVINCE_IDS),
  /** The itinerary's title. */
  head: z.string().min(1),
  /** Two or three photographs, stored as base64 data URLs. */
  images: z.array(z.string()).max(3).default([]),
  bestTime: z.string().optional(),
  suggestedLength: z.string().optional(),
  content1: z.string().default(""),
  content2: z.string().optional(),
  highlights: z.array(highlightSchema).default([]),
  /** Hidden itineraries stay in the admin list but never reach the wizard. */
  hidden: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.record(z.string(), translationSchema).default({}),
});
export type ItineraryRecord = z.infer<typeof itineraryRecordSchema>;

/** Everything the store holds, in the form it is exported and imported in. */
export const SCHEMA_VERSION = 1;

export const itineraryArchiveSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string().optional(),
  records: z.array(itineraryRecordSchema),
});
export type ItineraryArchive = z.infer<typeof itineraryArchiveSchema>;

/** The locales a record can be translated into — everything but the source. */
export const TRANSLATION_LOCALES = locales.filter((l) => l !== "en") as Exclude<Locale, "en">[];

export function emptyRecord(): ItineraryRecord {
  const now = new Date().toISOString();
  return {
    id: newId(),
    slug: "",
    category: ITINERARY_CATEGORY_IDS[0],
    province: PROVINCE_IDS[0],
    head: "",
    images: [],
    content1: "",
    highlights: [],
    hidden: false,
    createdAt: now,
    updatedAt: now,
    translations: {},
  };
}

/** `crypto.randomUUID` is not available over plain HTTP on some browsers. */
export function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `itn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** A slug no other record is already using. */
export function uniqueSlug(base: string, records: ItineraryRecord[], selfId: string) {
  const root = slugify(base) || "itinerary";
  const taken = new Set(records.filter((r) => r.id !== selfId).map((r) => r.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

export function translatableOf(record: ItineraryRecord): TranslatableFields {
  return {
    head: record.head,
    bestTime: record.bestTime,
    suggestedLength: record.suggestedLength,
    content1: record.content1,
    content2: record.content2,
    highlights: record.highlights.map((h) => ({ name: h.name, description: h.description })),
  };
}

export type { ItineraryCategory, ProvinceId };
