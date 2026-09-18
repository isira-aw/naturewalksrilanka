/**
 * Every Firestore collection this application uses, named once.
 *
 * Collection names are typed strings scattered across route handlers by
 * default, and a typo in one of them fails silently: reads return nothing and
 * writes quietly create a second, near-identical collection. Naming them here
 * makes that a compile error instead.
 */
export const COLLECTIONS = {
  /** One document per itinerary. */
  itineraries: "itineraries",
  /** Custom tour enquiries, with a `revisions` subcollection per document. */
  tourRequests: "tourRequests",
  /** One-time, expiring links that entitle a traveller to leave a review. */
  reviewInvites: "reviewInvites",
  /** Submitted reviews, pending until a staff member approves them. */
  reviews: "reviews",
  /** The admin allowlist: which email addresses may sign in to the panel. */
  staff: "staff",
  /** Newsletter sign-ups, keyed by the subscriber's own email address. */
  newsletterSubscribers: "newsletterSubscribers",
  /**
   * Refused admin sign-ins, keyed by the address that was refused.
   *
   * Both an audit line the Access section shows and the counter that rate
   * limits repeated attempts — see `lib/admin/signInGuard.ts`.
   */
  adminSignInAttempts: "adminSignInAttempts",
  /**
   * The enquiry spam counters, one document per hash bucket.
   *
   * A fixed set of buckets rather than one document per caller, so the
   * collection cannot grow — see `lib/tourRequests/rateLimit.ts`. No address
   * or hash is stored in them.
   */
  enquiryRateLimits: "enquiryRateLimits",
  /** Configuration the team edits in the panel. One document per area. */
  settings: "settings",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** The documents inside `settings`, named here for the same reason. */
export const SETTINGS_DOCS = {
  customTour: "customTour",
} as const;

/** Revisions hang off a request, so the history cannot outlive its parent. */
export const REVISIONS_SUBCOLLECTION = "revisions";

/* Files are not Firebase's job. Photographs live on Cloudinary; the folders
   they are filed under are `CLOUDINARY_FOLDERS` in `lib/cloudinary/config.ts`. */
