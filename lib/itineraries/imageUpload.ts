"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { firebaseAuth, firebaseStorage } from "@/lib/firebase/client";
import { dataUrlToBlur, fileToDataUrl } from "./imageFile";

/**
 * Takes a chosen photograph, uploads it to Firebase Storage, and returns what
 * should be stored on the record: the Storage URL and a blur placeholder.
 *
 * Firebase Storage is the only destination. There used to be a fallback that
 * kept the image inline as a base64 data URL whenever the upload could not
 * happen — which meant a misconfigured deployment silently went on working
 * while quietly reinflating the itinerary JSON that every custom-tour visitor
 * downloads whole: about a third larger than the binary, never optimised by
 * `next/image`, and impossible to cache separately from the data. Failing
 * visibly is better. The form catches what this throws and shows it.
 *
 * Reading an inline image is still supported, because records written before
 * this change may carry one — see `isInlineImage`.
 */

/** What the record should store for one chosen photograph. */
export type PreparedImage = {
  /** The Firebase Storage download URL. */
  src: string;
  /** A blur placeholder for `src`, held while the photograph loads. */
  blur?: string;
};

export async function prepareItineraryImage(
  file: File,
  itineraryId: string,
  name: string,
): Promise<PreparedImage> {
  const storage = firebaseStorage();
  if (!storage) {
    throw new Error(
      "Photograph uploads are unavailable: this deployment has no Firebase configuration.",
    );
  }

  /* Storage writes require a signed-in Firebase account carrying the `admin`
     claim — see `storage.rules`. Checking here turns what would be an opaque
     permission-denied from the SDK into a sentence that says what to do. */
  const auth = firebaseAuth();
  if (!auth?.currentUser) {
    throw new Error("Your session has expired. Sign in again to upload photographs.");
  }

  /* `fileToDataUrl` resizes and re-encodes to JPEG in the browser, so a
     camera original is not what gets uploaded. */
  const dataUrl = await fileToDataUrl(file);

  let src: string;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    /* The extension is known rather than taken from the original file name,
       because the re-encode above always produces JPEG. */
    const path = `itineraries/${itineraryId}/${name}-${Date.now()}.jpg`;
    const target = ref(storage, path);
    await uploadBytes(target, blob, { contentType: "image/jpeg" });
    src = await getDownloadURL(target);
  } catch (cause) {
    throw new Error(
      `That photograph could not be uploaded: ${
        cause instanceof Error ? cause.message : "unknown error"
      }`,
    );
  }

  /* Outside the upload's try on purpose: by this point the photograph is in
     Storage, and no failure while making a decoration may throw that URL
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
