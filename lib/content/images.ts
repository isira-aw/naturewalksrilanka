import "server-only";
import fs from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Shown wherever a destination's own photograph has not been supplied yet. */
export const DESTINATION_FALLBACK = "/images/placeholder-destination.jpg";

/* One check per path per process: the answer only changes on a redeploy. */
const cache = new Map<string, boolean>();

function exists(src: string) {
  const cached = cache.get(src);
  if (cached !== undefined) return cached;
  // Only ever look inside public/, whatever the content file asks for.
  const resolved = path.join(PUBLIC_DIR, path.normalize(src));
  const inside = resolved.startsWith(PUBLIC_DIR + path.sep);
  const found = inside && fs.existsSync(resolved);
  cache.set(src, found);
  return found;
}

/**
 * Content can name a photograph before the photograph exists. This returns the
 * file when it is really in `public/`, and the fallback until then — so the
 * destination folders can be wired up now and the real images simply dropped
 * in later, with no content or code change.
 */
export function resolveImage(src: string | undefined, fallback = DESTINATION_FALLBACK) {
  if (!src || !src.startsWith("/")) return fallback;
  return exists(src) ? src : fallback;
}

/** True when the content file names a photograph that is really in `public/`. */
export function imageExists(src: string | undefined): src is string {
  if (!src || !src.startsWith("/")) return false;
  return exists(src);
}

/** Drops gallery entries whose file has not been supplied yet. */
export function resolveGallery<T extends { src: string }>(images: T[] | undefined): T[] {
  return (images ?? []).filter((image) => exists(image.src));
}
