import { z } from "zod";

/**
 * Customer reviews, and the one-time links that entitle someone to leave
 * one.
 *
 * The shape of this feature is set by a single decision: a review can only
 * be written by somebody the team invited. Every link is made by hand — from
 * an enquiry, or from nothing at all for a traveller the team met some other
 * way — so spam is structurally impossible rather than something to filter,
 * and moderation is a quality gate — is this useful to publish — rather than
 * a defence.
 */

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const MAX_REVIEW_PHOTOS = 4;
/** Generous for a resized holiday photo, mean enough to stop an upload abuse. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * An invitation to review, which is also the credential for doing so.
 *
 * Single-use and expiring because the link travels through WhatsApp and
 * email, where it will be forwarded, quoted and screenshotted. A token that
 * worked forever would eventually be somebody else's way in.
 */
export const reviewInviteSchema = z.object({
  token: z.string().min(32),
  /**
   * The enquiry this review is about, when the link was made from one, and
   * the traveller's own details copied from it.
   *
   * All three are empty on a link made by hand. The team meets travellers who
   * never filled the form in — an agent's group, a repeat guest, somebody met
   * on the trail — and asking them to produce an enquiry first, or handing
   * over an email address to be matched against, would cost the review. The
   * token is the whole credential either way; nothing here is checked against
   * what the person leaving the review types.
   */
  reference: z.string().min(1).nullable().default(null),
  email: z.string().email().nullable().default(null),
  name: z.string().default(""),
  /** What the team typed to remember who a hand-made link was for. */
  label: z.string().default(""),
  locale: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  /** Set the moment a review is submitted; a used invite is spent. */
  usedAt: z.string().nullable(),
  /** Who sent it, so the panel can show that it was already asked for. */
  invitedBy: z.string(),
});
export type ReviewInvite = z.infer<typeof reviewInviteSchema>;

export const reviewPhotoSchema = z.object({
  url: z.string().url(),
  /**
   * Cloudinary's handle for the file, so a rejected review's photos can be
   * removed.
   *
   * Optional only because a review submitted before photographs moved to
   * Cloudinary has no such handle — its file lives in the old Storage bucket
   * and has to be deleted by hand. New photos always carry one. Nothing
   * reads the old `path` field any more; a record still holding one simply
   * ignores it.
   */
  publicId: z.string().min(1).optional(),
});
export type ReviewPhoto = z.infer<typeof reviewPhotoSchema>;

export const reviewSchema = z.object({
  id: z.string().min(1),
  /** The enquiry, when the invitation came from one. */
  reference: z.string().min(1).nullable().default(null),
  author: z.string().min(1),
  country: z.string().optional(),
  /** Whole stars only: half stars invite deliberation nobody wants to give. */
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(1).max(4000),
  photos: z.array(reviewPhotoSchema).max(MAX_REVIEW_PHOTOS).default([]),
  locale: z.string(),
  status: reviewStatusSchema,
  createdAt: z.string(),
  /** Who approved or rejected it, and when. */
  moderatedAt: z.string().nullable().default(null),
  moderatedBy: z.string().nullable().default(null),
});
export type Review = z.infer<typeof reviewSchema>;

/** What the public review form sends. Photos arrive separately as data URLs. */
export const reviewSubmissionSchema = z.object({
  token: z.string().min(1),
  author: z.string().min(1).max(120),
  country: z.string().max(120).optional(),
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(1).max(4000),
  photos: z.array(z.string()).max(MAX_REVIEW_PHOTOS).default([]),
});
export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;

/**
 * A token nobody can guess.
 *
 * `randomUUID` twice rather than a counter or a hash of the reference: this
 * value *is* the authorisation, so it has to come from a cryptographic
 * source and carry no information about the request it belongs to.
 */
export function newInviteToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

/** Long enough to come home, unpack, and get round to it. */
export const INVITE_LIFETIME_DAYS = 60;

export function inviteExpiry(from = new Date()): string {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITE_LIFETIME_DAYS);
  return expires.toISOString();
}

export function isInviteUsable(invite: ReviewInvite, now = new Date()): boolean {
  if (invite.usedAt) return false;
  return new Date(invite.expiresAt) > now;
}
