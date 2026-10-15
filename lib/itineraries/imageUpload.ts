"use client";

import { dataUrlToBlur, fileToDataUrl } from "./imageFile";

/**
 * Takes a chosen photograph, uploads it to Firebase Storage, and returns what
 * should be stored on the record: the delivery URL and a blur placeholder.
 *
 * The bucket is the only destination. There used to be a fallback that kept
 * the image inline as a base64 data URL whenever the upload could not
 * happen — which meant a misconfigured deployment silently went on working
 * while quietly reinflating the itinerary JSON that every custom-tour
 * visitor downloads whole: about a third larger than the binary, never
 * optimised, and impossible to cache separately from the data. Failing
 * visibly is better. The form catches what this throws and shows it.
 *
 * The file goes from this browser straight to the bucket. It never passes
 * through a route handler — only the signed URL does, from
 * `/api/admin/storage-upload-url`, which is admin-only and decides the
 * object path itself. So the credential stays on the server and a
 * multi-megabyte upload never has to fit inside a serverless request.
 *
 * Reading an inline image is still supported, because records written before
 * this change may carry one — see `isInlineImage`.
 */

/** What the record should store for one chosen photograph. */
export type PreparedImage = {
  /** The Firebase Storage delivery URL. */
  src: string;
  /** A blur placeholder for `src`, held while the photograph loads. */
  blur?: string;
};

type SignedUploadResponse = {
  /** A short-lived URL to `PUT` the JPEG to. */
  uploadUrl: string;
  /** The public delivery URL the record should store. */
  url: string;
};

export async function prepareItineraryImage(
  file: File,
  itineraryId: string,
  name: string,
): Promise<PreparedImage> {
  /* Ask first, upload second: if the session has lapsed or the deployment
     has no Storage bucket configured, that should be one clear sentence
     before the browser spends anything sending the file. */
  const signatureResponse = await fetch("/api/admin/storage-upload-url", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itineraryId, name }),
  });

  if (!signatureResponse.ok) {
    if (signatureResponse.status === 401) {
      throw new Error("Your session has expired. Sign in again to upload photographs.");
    }
    if (signatureResponse.status === 503) {
      throw new Error(
        "Photograph uploads are unavailable: this deployment has no Firebase Storage bucket configured.",
      );
    }
    throw new Error("That photograph could not be uploaded. Try again shortly.");
  }

  const signed = (await signatureResponse.json()) as SignedUploadResponse;

  /* `fileToDataUrl` resizes and re-encodes to JPEG in the browser, so a
     camera original is not what gets uploaded. */
  const dataUrl = await fileToDataUrl(file);

  let src: string;
  try {
    /* The signature binds the object path and `image/jpeg`, so the type
       header must be exactly that or the bucket rejects the request. */
    const blob = await (await fetch(dataUrl)).blob();
    const upload = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
    if (!upload.ok) throw new Error(`HTTP ${upload.status}`);
    src = signed.url;
  } catch (cause) {
    throw new Error(
      `That photograph could not be uploaded: ${
        cause instanceof Error ? cause.message : "unknown error"
      }`,
    );
  }

  /* Outside the upload's try on purpose: by this point the photograph is in
     the bucket, and no failure while making a decoration may throw that URL
     away. The blur is taken from the same re-encoded copy that was uploaded,
     so the placeholder matches the photograph. */
  let blur: string | undefined;
  try {
    blur = await dataUrlToBlur(dataUrl);
  } catch {
    /* No placeholder just means the frame loads without one. */
  }

  return { src, blur };
}

/**
 * True for an image held inline as a data URL.
 *
 * Nothing writes one any more. This exists so the admin form can still report
 * the weight of a record saved before uploads were mandatory, and so `Photo`
 * knows to render it as a plain `img`.
 */
export function isInlineImage(src: string | undefined): boolean {
  return typeof src === "string" && src.startsWith("data:");
}
