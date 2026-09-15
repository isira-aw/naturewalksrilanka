import "server-only";
import { CLOUDINARY_FOLDERS, requireCloudinary } from "./config";
import { cloudinaryTimestamp, signedParams } from "./sign";

/**
 * Uploading and deleting images, server side.
 *
 * Review photographs go through here because they arrive at the server as
 * data URLs and their limits — count, decoded size, content type — can only
 * be enforced somewhere the caller does not control. Itinerary photographs
 * do *not*: the admin's browser uploads those straight to Cloudinary with a
 * signature this server issues, so a 4 MB image never makes a round trip
 * through a serverless function. `app/api/admin/cloudinary-signature` is
 * that endpoint.
 */

export type UploadedImage = {
  /** The delivery URL to store on the record. Always https. */
  url: string;
  /** Cloudinary's handle for the file, needed to delete it later. */
  publicId: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

function endpoint(cloudName: string, action: "upload" | "destroy") {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`;
}

/**
 * Uploads one image and returns what belongs on the record.
 *
 * `file` is a data URL. Cloudinary accepts one directly, so the bytes are
 * never decoded and re-encoded here just to hand them on — the caller has
 * already decoded them once to check the size, and doing it twice on a
 * serverless function is the kind of thing that shows up as a timeout on a
 * slow connection.
 */
export async function uploadImage(
  file: string,
  folder: string,
  publicId: string,
): Promise<UploadedImage> {
  const { cloudName } = requireCloudinary();

  const body = new FormData();
  /* `overwrite` is not set: a fresh public_id per upload means a replaced
     photograph gets a new URL, so a CDN edge holding the old one cannot
     serve it in place of the new. */
  for (const [key, value] of Object.entries(
    signedParams({ folder, public_id: publicId, timestamp: cloudinaryTimestamp() }),
  )) {
    body.append(key, value);
  }
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch(endpoint(cloudName, "upload"), { method: "POST", body });
  } catch (cause) {
    throw new Error(
      `Cloudinary could not be reached: ${cause instanceof Error ? cause.message : "unknown error"}`,
    );
  }

  const result = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;
  if (!response.ok || !result.secure_url || !result.public_id) {
    throw new Error(
      `Cloudinary refused the upload: ${result.error?.message ?? `HTTP ${response.status}`}`,
    );
  }

  return { url: result.secure_url, publicId: result.public_id };
}

/** Uploads a review photograph. One folder per review, so rejection is tidy. */
export function uploadReviewPhoto(file: string, reviewId: string, index: number) {
  return uploadImage(file, CLOUDINARY_FOLDERS.reviewPhoto(reviewId), `photo-${index}`);
}

/**
 * Deletes one image, and says whether it went.
 *
 * Never throws. Deleting is always cleanup after a decision that has already
 * been made — a rejected review, an abandoned upload — and failing the
 * decision because the tidying failed would be the wrong trade. The caller
 * logs what it could not remove.
 */
export async function destroyImage(publicId: string): Promise<boolean> {
  const { cloudName } = requireCloudinary();

  const body = new FormData();
  for (const [key, value] of Object.entries(
    signedParams({ public_id: publicId, timestamp: cloudinaryTimestamp() }),
  )) {
    body.append(key, value);
  }

  try {
    const response = await fetch(endpoint(cloudName, "destroy"), { method: "POST", body });
    const result = (await response.json().catch(() => ({}))) as { result?: string };
    /* "not found" is success as far as the caller is concerned: the file is
       not there, which is the state that was asked for. */
    return response.ok && (result.result === "ok" || result.result === "not found");
  } catch {
    return false;
  }
}
