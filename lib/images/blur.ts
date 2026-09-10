import { publicImageBlur } from "./blurData.generated";

/**
 * The blur placeholder for an image, or `undefined` when there is none.
 *
 * `next/image` generates a `blurDataURL` on its own only for static imports,
 * and almost nothing here is one: content files, destination galleries and
 * itineraries all carry their images as strings. So the placeholders for
 * files under `public/` are generated ahead of time by
 * `scripts/optimize-images.mjs` and looked up here by path.
 *
 * Images from Firebase Storage are not in the manifest — they did not exist
 * when it was written. Their placeholder is generated in the browser at
 * upload time and stored on the itinerary, and reaches `Photo` as an explicit
 * `blurDataURL` prop instead.
 *
 * Anything unknown returns `undefined`, which renders exactly as before. A
 * missing placeholder must never be an error: images are added to `public/`
 * by hand, and one that has not been through the script yet should still
 * appear.
 */
export function blurFor(src: string): string | undefined {
  if (!src.startsWith("/")) return undefined;
  /* A query string or fragment is not part of the file's path. */
  const path = src.split(/[?#]/, 1)[0];
  return publicImageBlur[path];
}
