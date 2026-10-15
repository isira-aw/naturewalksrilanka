import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SITE_URL } from "./lib/seo/site";

const handleI18n = createMiddleware(routing);

const canonicalHost = new URL(SITE_URL).host;

/**
 * Hosts that serve this site but must never be the address it is known by:
 * `www.` and the `<backend>--<project>.<region>.hosted.app` URL App Hosting
 * gives every backend. Left alone, each would be a second copy of every page,
 * and a search engine splits its ranking between copies.
 *
 * Deliberately a list of known aliases rather than "anything that is not the
 * canonical host". `localhost`, a preview deployment and the platform's own
 * health checks all arrive on other hosts and have to be served as they are.
 */
function isAlias(host: string): boolean {
  return host === `www.${canonicalHost}` || host.endsWith(".hosted.app");
}

/**
 * The host the visitor actually asked for. Behind App Hosting the request
 * reaches the server by way of a proxy, and `x-forwarded-host` is the original.
 * A forged value can only cause a redirect to our own canonical origin.
 */
function requestedHost(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("host") || "").toLowerCase();
}

export default function proxy(request: NextRequest) {
  const host = requestedHost(request);
  const safeMethod = request.method === "GET" || request.method === "HEAD";

  if (safeMethod && host !== canonicalHost && isAlias(host)) {
    const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, SITE_URL);
    /* Permanent: it tells search engines to move whatever they have indexed
       under the alias onto the canonical URL, and to keep it there. */
    return NextResponse.redirect(target, 301);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
