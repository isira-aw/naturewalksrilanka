import "server-only";
import { randomUUID } from "node:crypto";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { destroyImage, uploadReviewPhoto } from "@/lib/cloudinary/media";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_REVIEW_PHOTOS,
  inviteExpiry,
  isInviteUsable,
  newInviteToken,
  reviewInviteSchema,
  reviewSchema,
  type Review,
  type ReviewInvite,
  type ReviewPhoto,
  type ReviewStatus,
  type ReviewSubmission,
} from "./types";

function invites() {
  const { db } = requireFirebase();
  return db.collection(COLLECTIONS.reviewInvites);
}

function reviews() {
  const { db } = requireFirebase();
  return db.collection(COLLECTIONS.reviews);
}

/* ---- invites ----------------------------------------------------------- */

/**
 * Makes a review link.
 *
 * A link is for somebody the team knows and the system does not, so all it
 * carries is the language the form should open in and a label the team typed
 * to remember who it was for. The token is the credential; there is nothing
 * here to check anybody against.
 */
export async function createInvite(
  input: { label?: string; locale: string },
  invitedBy: string,
): Promise<ReviewInvite> {
  const invite: ReviewInvite = {
    token: newInviteToken(),
    /* Written as nulls rather than left out: Firestore rejects `undefined`.
       Links made while invitations came from enquiries still carry a
       reference, an address and a name, and the panel still shows them. */
    reference: null,
    email: null,
    name: "",
    label: input.label ?? "",
    locale: input.locale,
    createdAt: new Date().toISOString(),
    expiresAt: inviteExpiry(),
    usedAt: null,
    invitedBy,
  };

  /* The token is the document id, so redeeming a link is one read. */
  await invites().doc(invite.token).create(invite);
  return invite;
}

export async function getInvite(token: string): Promise<ReviewInvite | null> {
  if (!token || token.length < 32) return null;
  const doc = await invites().doc(token).get();
  if (!doc.exists) return null;
  const parsed = reviewInviteSchema.safeParse(doc.data());
  return parsed.success ? parsed.data : null;
}

/**
 * The most recent links, newest first.
 *
 * A link belongs to no enquiry, so without this the panel would lose it the
 * moment the page reloaded — and a link that cannot be found again is a link
 * that gets made twice.
 */
export async function listInvites(limit = 40): Promise<ReviewInvite[]> {
  const snapshot = await invites().orderBy("createdAt", "desc").limit(limit).get();
  return parseInvites(snapshot.docs);
}

function parseInvites(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): ReviewInvite[] {
  return docs
    .map((doc) => reviewInviteSchema.safeParse(doc.data()))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}

/* ---- photos ------------------------------------------------------------ */

const DATA_URL = /^data:(image\/[a-z+]+);base64,(.+)$/i;

/**
 * Stores one submitted photo, or throws.
 *
 * Review photographs are uploaded by the server rather than straight from
 * the browser, unlike itinerary photographs. The reason is that the limits
 * below have to be enforced somewhere the submitter does not control: a
 * traveller holding a review link has no account to attribute an upload to,
 * a client-side check is a courtesy to honest users and nothing more, and
 * the decoded byte length of a data URL is not something an upload preset
 * can see. So the bytes land here first, get checked, and only then go on.
 *
 * The content type is taken from the declared prefix but validated against
 * an allowlist, so a renamed executable cannot be stored as `image/jpeg`
 * and later served with a type the browser will execute.
 */
async function storePhoto(dataUrl: string, reviewId: string, index: number): Promise<ReviewPhoto> {
  const match = DATA_URL.exec(dataUrl);
  if (!match) throw new Error("photo_not_an_image");

  const [, contentType, base64] = match;
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(contentType)) {
    throw new Error("photo_type_not_allowed");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_PHOTO_BYTES) throw new Error("photo_too_large");
  if (buffer.byteLength === 0) throw new Error("photo_empty");

  /* The validated data URL is handed on as-is. Cloudinary accepts one
     directly, so the bytes are not decoded and re-encoded a second time
     purely to forward them. */
  const { url, publicId } = await uploadReviewPhoto(dataUrl, reviewId, index);
  return { url, publicId };
}

/* ---- submitting -------------------------------------------------------- */

/**
 * Redeems an invite and records the review, or explains why not.
 *
 * The invite is marked used inside a transaction *before* anything is
 * published, so two submissions racing on the same link cannot both
 * succeed. Photos are uploaded first: a review that references files which
 * failed to store would be worse than a submission that failed outright and
 * can be retried.
 */
export async function submitReview(
  submission: ReviewSubmission,
): Promise<{ review: Review } | { error: string }> {
  const { db } = requireFirebase();

  const invite = await getInvite(submission.token);
  if (!invite) return { error: "invalid_token" };
  if (!isInviteUsable(invite)) return { error: "token_spent" };

  if (submission.photos.length > MAX_REVIEW_PHOTOS) return { error: "too_many_photos" };

  const id = randomUUID();
  const photos: ReviewPhoto[] = [];
  try {
    for (const [index, photo] of submission.photos.entries()) {
      photos.push(await storePhoto(photo, id, index));
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "photo_failed" };
  }

  const review: Review = {
    id,
    reference: invite.reference,
    author: submission.author.trim(),
    country: submission.country?.trim() || undefined,
    rating: submission.rating,
    quote: submission.quote.trim(),
    photos,
    locale: invite.locale,
    status: "pending",
    createdAt: new Date().toISOString(),
    moderatedAt: null,
    moderatedBy: null,
  };

  const inviteRef = invites().doc(invite.token);
  const committed = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(inviteRef);
    const parsed = reviewInviteSchema.safeParse(fresh.data());
    /* Re-checked inside the transaction: the read above could be stale by
       the time we get here if the same link was opened twice. */
    if (!parsed.success || !isInviteUsable(parsed.data)) return false;

    transaction.update(inviteRef, { usedAt: new Date().toISOString() });
    transaction.set(reviews().doc(id), review);
    return true;
  });

  if (!committed) {
    /* Somebody else redeemed it in between. Clean up the orphaned uploads
       rather than leaving files nothing points at. */
    await deletePhotos(photos);
    return { error: "token_spent" };
  }

  return { review };
}

/* ---- moderation -------------------------------------------------------- */

export async function listReviews(status?: ReviewStatus, limit = 100): Promise<Review[]> {
  let query = reviews().orderBy("createdAt", "desc").limit(limit);
  if (status) query = reviews().where("status", "==", status).orderBy("createdAt", "desc").limit(limit);

  const snapshot = await query.get();
  const found: Review[] = [];
  for (const doc of snapshot.docs) {
    const parsed = reviewSchema.safeParse(doc.data());
    if (parsed.success) found.push(parsed.data);
    else console.error(`Skipping malformed review ${doc.id}`);
  }
  return found;
}

/**
 * Moves a review between states. Rejecting deletes the photographs.
 *
 * A rejected review is usually rejected *because* of what it contains, and
 * the files stay publicly readable at their URLs for as long as they exist
 * — keeping them would mean the moderation decision had no effect on the
 * thing being moderated.
 *
 * Back to `pending` is how a published review is taken down: it leaves the
 * public site immediately but keeps the words and the photographs, so the
 * decision can be looked at again rather than only undone by asking the
 * traveller to write it out a second time. Removing it for good is
 * `deleteReview`.
 */
export async function moderateReview(
  id: string,
  status: ReviewStatus,
  moderatedBy: string,
): Promise<Review | null> {
  const ref = reviews().doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const parsed = reviewSchema.safeParse(doc.data());
  if (!parsed.success) return null;

  if (status === "rejected") await deletePhotos(parsed.data.photos);

  const next: Review = {
    ...parsed.data,
    photos: status === "rejected" ? [] : parsed.data.photos,
    status,
    moderatedAt: new Date().toISOString(),
    moderatedBy,
  };
  await ref.set(next);
  return next;
}

/**
 * Removes a review and its photographs for good.
 *
 * Rejecting is the reversible decision and this is the other one: nothing is
 * kept, and a traveller who asks for their words to be taken off the site
 * gets exactly that. The caller is expected to have asked first — there is
 * no undo.
 */
export async function deleteReview(id: string): Promise<boolean> {
  const ref = reviews().doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;

  const parsed = reviewSchema.safeParse(doc.data());
  /* A record too malformed to parse is still deleted: the photographs are
     the part that needs a valid record, and leaving the row behind would
     mean the button did nothing. */
  if (parsed.success) await deletePhotos(parsed.data.photos);

  await ref.delete();
  return true;
}

/**
 * Removes the files behind a rejected review.
 *
 * A photo saved before images moved to Cloudinary carries no `publicId`, and
 * this cannot reach into the old bucket to delete it — that code is gone. It
 * says so rather than reporting a deletion that did not happen; the file has
 * to be removed by hand. Moderation itself never fails over tidying up.
 */
async function deletePhotos(photos: ReviewPhoto[]) {
  if (photos.length === 0) return;

  await Promise.all(
    photos.map(async (photo) => {
      if (!photo.publicId) {
        console.error(
          `Review photo ${photo.url} predates Cloudinary and was not deleted; remove it by hand.`,
        );
        return;
      }
      if (!(await destroyImage(photo.publicId))) {
        console.error(`Could not delete review photo ${photo.publicId}; remove it by hand.`);
      }
    }),
  );
}

/* ---- public ------------------------------------------------------------ */

/** Approved reviews for the public page, newest first. */
export async function listApprovedReviews(limit = 24): Promise<Review[]> {
  return listReviews("approved", limit);
}
