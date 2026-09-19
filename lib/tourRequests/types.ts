import { z } from "zod";
import { TRAVELLER_CEILING } from "@/lib/settings/customTour";

/**
 * A custom tour enquiry, as recorded when the traveller sends it.
 *
 * Until now nothing was kept: the wizard built a WhatsApp message and a
 * document, the traveller left, and the only trace was a chat thread. That
 * left travellers unable to look up what they had asked for, and the team
 * without a queue.
 *
 * The wizard's answers are stored as one opaque `payload` map rather than as
 * columns. The wizard changes often — a step was added and an AI step
 * removed in recent memory — and every such change would otherwise mean a
 * schema migration over live enquiry data. What the business needs to query
 * (reference, email, status, dates) is lifted out; the rest is kept whole.
 */

export const REQUEST_STATUSES = [
  "received",
  "in-progress",
  "quoted",
  "confirmed",
  "closed",
] as const;

export const requestStatusSchema = z.enum(REQUEST_STATUSES);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

/**
 * Upper bounds on every free-text field.
 *
 * This endpoint is unauthenticated by design — a traveller must be able to
 * send an enquiry without an account. Without a ceiling on the prose fields
 * one request could push about a megabyte into Firestore, and nothing stopped
 * a loop of them. The limits are set well above what a real enquiry needs:
 * the longest genuine "requirements" anyone has written is a few paragraphs.
 */
export const FIELD_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  country: 80,
  requirements: 4000,
  accommodationNotes: 2000,
  /** One slug. The count is capped separately. */
  slug: 120,
  interests: 20,
  selectedExperiences: 40,
  accommodation: 20,
} as const;

/** What the wizard sends. Mirrors `WizardState` without the step counter. */
export const requestPayloadSchema = z.object({
  /* The hard ceiling, not the configurable limit the wizard offers. This
     endpoint is unauthenticated, so its validation cannot depend on a
     Firestore read that might fail — and must not be widened by anything the
     caller controls. `lib/settings/customTour.ts` explains the two. */
  travelers: z.number().int().min(1).max(TRAVELLER_CEILING),
  dateRange: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
  }),
  interests: z.array(z.string().max(FIELD_LIMITS.slug)).max(FIELD_LIMITS.interests),
  selectedExperiences: z
    .array(z.string().max(FIELD_LIMITS.slug))
    .max(FIELD_LIMITS.selectedExperiences),
  accommodation: z
    .array(z.string().max(FIELD_LIMITS.slug))
    .max(FIELD_LIMITS.accommodation),
  accommodationNotes: z.string().max(FIELD_LIMITS.accommodationNotes),
  name: z.string().min(1).max(FIELD_LIMITS.name),
  email: z.string().email().max(FIELD_LIMITS.email),
  phone: z.string().min(1).max(FIELD_LIMITS.phone),
  country: z.string().max(FIELD_LIMITS.country),
  requirements: z.string().max(FIELD_LIMITS.requirements),
});
export type RequestPayload = z.infer<typeof requestPayloadSchema>;

/**
 * One message on an enquiry's thread.
 *
 * The enquiry itself is never edited after it is sent — not by the traveller
 * and not by the team. What somebody asked for is the record a quote is
 * built against, and a record that can be rewritten is not one. Everything
 * that comes *after* it is said here instead, by either side, in order, and
 * nothing said is ever changed or removed.
 *
 * `author` is the side that wrote it, and is what the traveller's copy of
 * the thread is labelled from. `authorEmail` is kept for the team's own
 * audit and is never sent to the traveller — a staff member answering an
 * enquiry should not be handing out their address with every reply.
 */
export const COMMENT_AUTHORS = ["traveller", "staff"] as const;
export const commentAuthorSchema = z.enum(COMMENT_AUTHORS);
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;

/** Long enough for a paragraph of context; short enough to bound the doc. */
export const COMMENT_BODY_LIMIT = 2000;

export const tripCommentSchema = z.object({
  id: z.string().min(1),
  author: commentAuthorSchema,
  /** Who wrote it, for the team. Stripped before a traveller sees it. */
  authorEmail: z.string().email(),
  body: z.string().min(1).max(COMMENT_BODY_LIMIT),
  createdAt: z.string(),
});
export type TripComment = z.infer<typeof tripCommentSchema>;

/** What either side may post. The rest of a comment is the server's to set. */
export const commentInputSchema = z.object({
  body: z.string().trim().min(1).max(COMMENT_BODY_LIMIT),
});

/**
 * A take-away document the traveller actually saved, recorded when the
 * download succeeds.
 *
 * Only that it happened — no file is stored here. The document itself is
 * reproduced from `documentSnapshot` below.
 */
export const requestDownloadSchema = z.object({
  kind: z.enum(["pdf", "doc"]),
  at: z.string(),
  locale: z.string(),
});
export type RequestDownload = z.infer<typeof requestDownloadSchema>;

/**
 * The resolved journey document, as it stood when the enquiry was sent.
 *
 * Kept as an opaque object on purpose. `JourneyDocument` lives in
 * `lib/journey-document/model.ts` and is shaped by what the renderers need;
 * pinning its shape here as well would mean two definitions to keep in step,
 * and a snapshot that fails to parse is worse than one that is merely old.
 * It is validated on the way *out*, where a malformed one can simply fall
 * back to rebuilding from today's itineraries.
 *
 * Photographs are URLs, never binary — a snapshot is tens of kilobytes.
 */
export const documentSnapshotSchema = z.object({
  /** When it was taken, which is not necessarily when the enquiry was sent. */
  at: z.string(),
  /** The locale the traveller was reading, so the rebuild matches their copy. */
  locale: z.string(),
  /** A `JourneyDocument`. Parsed where it is used, not here. */
  document: z.unknown(),
});
export type DocumentSnapshot = z.infer<typeof documentSnapshotSchema>;

export const tourRequestSchema = z.object({
  /** Short, sayable over the phone, and printed on the WhatsApp message. */
  reference: z.string().min(1),
  /** Lowercased; this is what a returning traveller is matched against. */
  email: z.string().email(),
  locale: z.string(),
  status: requestStatusSchema,
  payload: requestPayloadSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  /**
   * The journey document as the traveller's browser built it.
   *
   * Without this the admin panel can still rebuild the PDF — the plan is
   * pure arithmetic over `payload` — but it would rebuild it from *today's*
   * itineraries, so editing or deleting an itinerary would silently change
   * what a past enquiry appears to have asked for. The snapshot is what
   * makes the rebuilt file the traveller's file.
   */
  documentSnapshot: documentSnapshotSchema.optional(),
  /** Which take-away files the traveller actually saved, and when. */
  downloads: z.array(requestDownloadSchema).default([]),
});
export type TourRequest = z.infer<typeof tourRequestSchema>;

/**
 * A reference a person can read out without spelling it.
 *
 * No vowels, so it cannot accidentally spell a word; no 0/O or 1/I/L, which
 * are the characters people mistype when copying from a screen. This is a
 * label, never a credential — anyone can guess a neighbouring code, so
 * seeing a request always requires proving the email address too.
 */
const ALPHABET = "23456789BCDFGHJKMNPQRSTVWXYZ";

export function newReference(): string {
  let body = "";
  for (let i = 0; i < 5; i += 1) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `NW-${body}`;
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}
