import "server-only";
import { randomUUID } from "node:crypto";
import { requireFirebase } from "@/lib/firebase/admin";
import { COLLECTIONS, STORAGE_PATHS } from "@/lib/firebase/collections";
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

export async function createInvite(
  input: { reference: string; email: string; name: string; locale: string },
  invitedBy: string,
): Promise<ReviewInvite> {
  const invite: ReviewInvite = {
    token: newInviteToken(),
    reference: input.reference,
    email: input.email,
    name: input.name,
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

/** Invites already sent for a reference, so the panel does not offer twice. */
export async function invitesForReference(reference: string): Promise<ReviewInvite[]> {
  const snapshot = await invites().where("reference", "==", reference).get();
  return snapshot.docs
    .map((doc) => reviewInviteSchema.safeParse(doc.data()))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}

/* ---- photos ------------------------------------------------------------ */

const DATA_URL = /^data:(image\/[a-z+]+);base64,(.+)$/i;

/**
 * Stores one submitted photo, or throws.
 *
 * Uploads go through the server rather than straight from the browser, so
 * that these limits are actually enforced. A client-side check is a
 * courtesy to honest users and nothing more — anyone can call the endpoint
 * directly — and Storage rules cannot see the decoded size of a data URL.
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

  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = STORAGE_PATHS.reviewPhoto(reviewId, `photo-${index}.${extension}`);

  const { storage } = requireFirebase();
  const token = randomUUID();
  const file = storage.bucket().file(path);
  await file.save(buffer, {
    contentType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    resumable: false,
  });

  const bucketName = storage.bucket().name;
  return {
    url: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
    path,
  };
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
 * Approves or rejects. Rejecting deletes the photographs.
 *
 * A rejected review is usually rejected *because* of what it contains, and
 * the files stay publicly readable at their URLs for as long as they exist
 * — keeping them would mean the moderation decision had no effect on the
 * thing being moderated.
 */
export async function moderateReview(
  id: string,
  status: Exclude<ReviewStatus, "pending">,
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

async function deletePhotos(photos: ReviewPhoto[]) {
  if (photos.length === 0) return;
  const { storage } = requireFirebase();
  await Promise.all(
    photos.map((photo) =>
      storage
        .bucket()
        .file(photo.path)
        .delete()
        .catch(() => {
          /* Already gone, or never stored. Not worth failing moderation. */
        }),
    ),
  );
}

/* ---- public ------------------------------------------------------------ */

/** Approved reviews for the public page, newest first. */
export async function listApprovedReviews(limit = 24): Promise<Review[]> {
  return listReviews("approved", limit);
}
