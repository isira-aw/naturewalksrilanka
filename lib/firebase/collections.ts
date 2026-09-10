/**
 * Every Firestore collection this application uses, named once.
 *
 * Collection names are typed strings scattered across route handlers by
 * default, and a typo in one of them fails silently: reads return nothing and
 * writes quietly create a second, near-identical collection. Naming them here
 * makes that a compile error instead.
 */
export const COLLECTIONS = {
  /** One document per itinerary; replaces the single Vercel Blob archive. */
  itineraries: "itineraries",
  /** Custom tour enquiries, with a `revisions` subcollection per document. */
  tourRequests: "tourRequests",
  /** One-time, expiring links that entitle a traveller to leave a review. */
  reviewInvites: "reviewInvites",
  /** Submitted reviews, pending until a staff member approves them. */
  reviews: "reviews",
  /** The admin allowlist: which email addresses may sign in to the panel. */
  staff: "staff",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** Revisions hang off a request, so the history cannot outlive its parent. */
export const REVISIONS_SUBCOLLECTION = "revisions";

/** Where uploads live in the Storage bucket. Mirrors `storage.rules`. */
export const STORAGE_PATHS = {
  itineraryImage: (itineraryId: string, fileName: string) =>
    `itineraries/${itineraryId}/${fileName}`,
  reviewPhoto: (reviewId: string, fileName: string) => `reviews/${reviewId}/${fileName}`,
} as const;
