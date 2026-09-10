"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { firebaseAuth, firebaseStorage } from "@/lib/firebase/client";
import { fileToDataUrl } from "./imageFile";

/**
 * Takes a chosen photograph and returns whatever should be stored on the
 * record: a Firebase Storage URL when that is possible, otherwise the old
 * base64 data URL.
 *
 * Uploading is the point of the exercise. Base64 images were kept inside the
 * itinerary JSON that every custom-tour visitor downloads whole — about a
 * third larger than the binary, never optimised by `next/image`, and
 * impossible to cache separately from the data. A real file behind a URL
 * fixes all three.
 *
 * The fallback is not a nicety. Storage writes require a signed-in Firebase
 * account carrying the `admin` claim (see `storage.rules`), and while the
 * legacy shared password is still in use there is no such account — the
 * admin is authenticated to this site but not to Firebase. Rather than fail
 * the save, the image goes inline exactly as before. Once every admin signs
 * in with Google, this branch stops being reached; delete it along with the
 * rest of the legacy path.
 */

/** Where the resize happens is unchanged; only the destination is new. */
export async function prepareItineraryImage(
  file: File,
  itineraryId: string,
  name: string,
): Promise<string> {
  const dataUrl = await fileToDataUrl(file);

  const storage = firebaseStorage();
  const auth = firebaseAuth();
  if (!storage || !auth?.currentUser) return dataUrl;

  try {
    const blob = await (await fetch(dataUrl)).blob();
    /* `fileToDataUrl` always re-encodes to JPEG, so the extension is known
       rather than taken from the original file name. */
    const path = `itineraries/${itineraryId}/${name}-${Date.now()}.jpg`;
    const target = ref(storage, path);
    await uploadBytes(target, blob, { contentType: "image/jpeg" });
    return await getDownloadURL(target);
  } catch (error) {
    /* An upload failure must not lose the photograph the admin just chose.
       Falling back to inline keeps the save working; the console line is for
       whoever wonders why the archive is growing again. */
    console.warn("Storage upload failed; keeping the image inline.", error);
    return dataUrl;
  }
}

/** True for images still held inline, which are the ones that cost space. */
export function isInlineImage(src: string | undefined): boolean {
  return typeof src === "string" && src.startsWith("data:");
}
