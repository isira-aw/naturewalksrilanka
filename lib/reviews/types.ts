import { z } from "zod";

/**
 * Customer reviews, and the one-time links that entitle someone to leave
 * one.
 *
 * The shape of this feature is set by a single decision: a review can only
 * be written by somebody the team invited, and the team only invites people
 * whose trip actually happened. That makes spam structurally impossible
 * rather than something to filter, and it means moderation is a quality
 * gate — is this useful to publish — rather than a defence.
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
  /** The enquiry this review is about. */
  reference: z.string().min(1),
  email: z.string().email(),
  name: z.string(),
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
  /** The Storage path, so a rejected review's photos can be removed. */
  path: z.string().min(1),
});
export type ReviewPhoto = z.infer<typeof reviewPhotoSchema>;

export const reviewSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
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
