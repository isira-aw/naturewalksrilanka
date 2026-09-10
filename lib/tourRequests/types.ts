import { z } from "zod";

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

/** What the wizard sends. Mirrors `WizardState` without the step counter. */
export const requestPayloadSchema = z.object({
  travelers: z.number().int().min(1).max(12),
  dateRange: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
  }),
  interests: z.array(z.string()),
  selectedExperiences: z.array(z.string()),
  accommodation: z.array(z.string()),
  accommodationNotes: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  country: z.string(),
  requirements: z.string(),
});
export type RequestPayload = z.infer<typeof requestPayloadSchema>;

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
  /** How many times the traveller has revised it. */
  revision: z.number().int().min(0).default(0),
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
