import "server-only";
import { adminBucket } from "./admin";

/**
 * Photographs, in Cloud Storage for Firebase.
 *
 * Everything goes through the Admin SDK, so `storage.rules` can deny every
 * client write and allow public reads — the same "no client access, auth lives
 * in the route handlers" shape as Firestore.
 *
 * Itinerary photographs are uploaded by the admin's browser straight to the
 * bucket under a short-lived signed URL (see `signedUploadUrl`); review
 * photographs arrive at the server as data URLs and are uploaded from here,
 * so their limits can be enforced somewhere the submitter does not control.
 */

export type UploadedImage = {
  /** The delivery URL to store on the record. Always https. */
  url: string;
  /** The object path inside the bucket, needed to delete it later. */
  publicId: string;
};

/** Where uploads are filed inside the bucket. */
export const STORAGE_FOLDERS = {
  itineraryImage: (itineraryId: string) => `naturewalk/itineraries/${itineraryId}`,
  reviewPhoto: (reviewId: string) => `naturewalk/reviews/${reviewId}`,
} as const;

/**
 * The public delivery URL for an object. Tokenless: `storage.rules` allows
 * public reads, and this host is already in `next.config.ts` `remotePatterns`.
 */
export function publicUrl(bucketName: string, path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;
}

function requireBucket() {
  const bucket = adminBucket();
  if (!bucket) throw new Error("Firebase Storage is not configured: FIREBASE_STORAGE_BUCKET not set.");
  return bucket;
}

/**
 * Uploads one validated data URL and returns what belongs on the record.
 * The caller has already checked type and size.
 */
export async function uploadDataUrl(
  dataUrl: string,
  path: string,
): Promise<UploadedImage> {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("Not a base64 data URL.");
  const [, contentType, base64] = match;

  const bucket = requireBucket();
  try {
    await bucket.file(path).save(Buffer.from(base64, "base64"), {
      contentType,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
  } catch (cause) {
    throw new Error(
      `Firebase Storage refused the upload: ${cause instanceof Error ? cause.message : "unknown error"}`,
    );
  }
  return { url: publicUrl(bucket.name, path), publicId: path };
}

/** Uploads a review photograph. One folder per review, so rejection is tidy. */
export function uploadReviewPhoto(dataUrl: string, reviewId: string, index: number) {
  return uploadDataUrl(dataUrl, `${STORAGE_FOLDERS.reviewPhoto(reviewId)}/photo-${index}`);
}

/**
 * A short-lived URL the admin's browser can `PUT` one JPEG to. The path and
 * content type are fixed by the signature, so the caller cannot redirect the
 * file elsewhere or upload a different type.
 */
export async function signedUploadUrl(path: string): Promise<{ uploadUrl: string; url: string }> {
  const bucket = requireBucket();
  const [uploadUrl] = await bucket.file(path).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000,
    contentType: "image/jpeg",
  });
  return { uploadUrl, url: publicUrl(bucket.name, path) };
}

/**
 * Deletes one object, and says whether it went. Never throws: deleting is
 * cleanup after a decision already made, and a missing object is success.
 */
export async function destroyImage(path: string): Promise<boolean> {
  try {
    await requireBucket().file(path).delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}
