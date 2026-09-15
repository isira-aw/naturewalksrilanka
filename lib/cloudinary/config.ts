/**
 * Cloudinary, which is where photographs live.
 *
 * It replaces Firebase Storage and nothing else: authentication is still
 * Firebase Auth and every document is still Firestore. Cloudinary has no
 * users and no database, so there is no version of this where it takes over
 * more than the image files.
 *
 * Deliberately no `cloudinary` npm package. The whole surface this project
 * needs is "upload one image" and "delete one image", which is two signed
 * POSTs; the SDK would add a dependency tree for that, and this repository
 * has twice been taken down by a lockfile that shifted underneath it (see
 * the `jose` override in `package.json`). `node:crypto` signs the requests.
 *
 * The cloud name is public — it appears in every delivery URL. The API key
 * and secret are not: the secret signs uploads and never reaches the browser,
 * which is why the admin form asks a route handler for a signature rather
 * than holding credentials itself.
 */

const CLOUD_NAME = "CLOUDINARY_CLOUD_NAME";
const API_KEY = "CLOUDINARY_API_KEY";
const API_SECRET = "CLOUDINARY_API_SECRET";

/** Which of the required variables are missing, if any. */
export function missingCloudinaryEnv(): string[] {
  return [CLOUD_NAME, API_KEY, API_SECRET].filter((name) => !process.env[name]);
}

export function isCloudinaryConfigured(): boolean {
  return missingCloudinaryEnv().length === 0;
}

/**
 * The three values, or a thrown error naming what is absent.
 *
 * Callers that cannot proceed without Cloudinary use this; callers that can
 * degrade check `isCloudinaryConfigured()` first and say so in the UI. As
 * with Firebase, nothing throws at import time, so a deployment with no
 * Cloudinary configuration still builds and still serves every public page.
 */
export function requireCloudinary() {
  const missing = missingCloudinaryEnv();
  if (missing.length > 0) {
    throw new Error(`Cloudinary is not configured: ${missing.join(", ")} not set.`);
  }
  return {
    cloudName: process.env[CLOUD_NAME] as string,
    apiKey: process.env[API_KEY] as string,
    apiSecret: process.env[API_SECRET] as string,
  };
}

/**
 * Where uploads are filed inside the Cloudinary account.
 *
 * The same two-folder shape the Storage bucket used, so the console stays
 * readable and a record's `public_id` still says what it belongs to.
 */
export const CLOUDINARY_FOLDERS = {
  itineraryImage: (itineraryId: string) => `naturewalk/itineraries/${itineraryId}`,
  reviewPhoto: (reviewId: string) => `naturewalk/reviews/${reviewId}`,
} as const;

/** The delivery host, for `next.config.ts` and for recognising our own URLs. */
export const CLOUDINARY_DELIVERY_HOST = "res.cloudinary.com";
