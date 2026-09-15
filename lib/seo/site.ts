/**
 * The site's own origin, in one place.
 *
 * Canonical links, hreflang alternates, the sitemap, robots.txt, llms.txt and
 * every JSON-LD `url` are all absolute, and all of them have to agree: two
 * spellings of the same origin is how a site ends up competing with itself in
 * the index. So they all read this.
 *
 * `NEXT_PUBLIC_SITE_URL` overrides it per environment — a preview deployment
 * that claims the production origin invites the preview to be indexed in its
 * place. The fallback is the production domain because that is where this is
 * going, and because a build with no environment at all still has to produce
 * absolute URLs that are at least self-consistent.
 */
const configured = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com";

/** No trailing slash, so `${SITE_URL}${path}` never yields a double slash. */
export const SITE_URL = configured.replace(/\/+$/, "");

/**
 * An absolute URL for a root-relative path.
 *
 * Anything already absolute is returned untouched: itinerary photographs come
 * from Firebase Storage and are absolute already, and prefixing those with
 * our own origin would produce a URL that 404s.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
