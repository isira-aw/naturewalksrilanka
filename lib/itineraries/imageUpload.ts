"use client";

import { dataUrlToBlur, fileToDataUrl } from "./imageFile";

/**
 * Takes a chosen photograph, uploads it to Cloudinary, and returns what
 * should be stored on the record: the delivery URL and a blur placeholder.
 *
 * Cloudinary is the only destination. There used to be a fallback that kept
 * the image inline as a base64 data URL whenever the upload could not
 * happen — which meant a misconfigured deployment silently went on working
 * while quietly reinflating the itinerary JSON that every custom-tour
 * visitor downloads whole: about a third larger than the binary, never
 * optimised, and impossible to cache separately from the data. Failing
 * visibly is better. The form catches what this throws and shows it.
 *
 * The file goes from this browser straight to Cloudinary. It never passes
 * through a route handler — only the signature does, from
 * `/api/admin/cloudinary-signature`, which is admin-only and decides the
 * folder and `public_id` itself. So the credential stays on the server and a
 * multi-megabyte upload never has to fit inside a serverless request.
 *
 * Reading an inline image is still supported, because records written before
 * this change may carry one — see `isInlineImage`.
 */

/** What the record should store for one chosen photograph. */
export type PreparedImage = {
  /** The Cloudinary delivery URL. */
  src: string;
  /** A blur placeholder for `src`, held while the photograph loads. */
  blur?: string;
};

type SignatureResponse = {
  cloudName: string;
  folder: string;
  publicId: string;
  api_key: string;
  signature: string;
  timestamp: string;
  public_id: string;
};

export async function prepareItineraryImage(
  file: File,
  itineraryId: string,
  name: string,
): Promise<PreparedImage> {
  /* Ask first, upload second: if the session has lapsed or the deployment
     has no Cloudinary configuration, that should be one clear sentence
     before the browser spends anything sending the file. */
  const signatureResponse = await fetch("/api/admin/cloudinary-signature", {
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
        "Photograph uploads are unavailable: this deployment has no Cloudinary configuration.",
      );
    }
    throw new Error("That photograph could not be uploaded. Try again shortly.");
  }

  const signed = (await signatureResponse.json()) as SignatureResponse;

  /* `fileToDataUrl` resizes and re-encodes to JPEG in the browser, so a
     camera original is not what gets uploaded. */
  const dataUrl = await fileToDataUrl(file);

  let src: string;
  try {
    const form = new FormData();
    form.append("file", dataUrl);
    form.append("api_key", signed.api_key);
    form.append("timestamp", signed.timestamp);
    form.append("signature", signed.signature);
    /* These two must be exactly what the server signed, or Cloudinary
       rejects the request. They are echoed back rather than rebuilt here so
       there is one place they can disagree, instead of two. */
    form.append("folder", signed.folder);
    form.append("public_id", signed.public_id);

    const upload = await fetch(
      `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
      { method: "POST", body: form },
    );

    const result = (await upload.json().catch(() => ({}))) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!upload.ok || !result.secure_url) {
      throw new Error(result.error?.message ?? `HTTP ${upload.status}`);
    }
    src = result.secure_url;
  } catch (cause) {
    throw new Error(
      `That photograph could not be uploaded: ${
        cause instanceof Error ? cause.message : "unknown error"
      }`,
    );
  }

  /* Outside the upload's try on purpose: by this point the photograph is on
     Cloudinary, and no failure while making a decoration may throw that URL
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
