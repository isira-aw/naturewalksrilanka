import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { legacyRedirects } from "./lib/seo/redirects";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/* The one hostname this site is allowed to be indexed under, taken from the
   same variable `app/sitemap.ts`, `app/robots.ts` and `lib/seo/jsonld.ts`
   build their absolute URLs from, so there is one source of truth for "which
   domain are we". The www variant is included because a host that redirects at
   the DNS layer today may be served directly tomorrow. */
const canonicalHost = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com"
).host;

const canonicalHosts = canonicalHost.startsWith("www.")
  ? [canonicalHost, canonicalHost.slice("www.".length)]
  : [canonicalHost, `www.${canonicalHost}`];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    /* Itinerary photographs now come from Firebase Storage. `next/image`
       refuses any remote host that is not listed here — silently, from the
       page's point of view — so this is required, not an optimisation.
       Both hosts are listed because Firebase serves buckets from the older
       `firebasestorage.googleapis.com` and the newer `*.firebasestorage.app`
       depending on when the bucket was created. */
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
    /* Re-optimising an image that will never change is wasted work; a day is
       a reasonable floor for photographs that are replaced by hand. */
    minimumCacheTTL: 60 * 60 * 24,
  },
  async redirects() {
    return legacyRedirects.map((r) => ({ ...r, permanent: true }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /* The host redirects http to https, but a redirect is still one
             plaintext round trip an attacker on the network can meet first.
             HSTS removes it: the browser rewrites to https on its own for the
             next two years, and never asks over http again. Only sent over
             https, so it cannot strand a local http dev server.

             `preload` is deliberately omitted. It is a one-way door — getting
             a domain off the preload list takes months — and it commits every
             present and future subdomain to https along with it. Add it once
             the certificate setup has been stable for a while. */
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          /* Sending the full URL of an admin or one-time review page to a
             third-party host is a leak; the origin alone is all any of them
             need, and it keeps referral analytics working. */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      /* Anything served from a host other than the canonical one is a test
         deployment — the Vercel project URL, a preview build, localhost — and
         must stay out of the index. Without this, the staging copy is a
         complete duplicate of the real site, and the two compete.

         Deliberately a header rather than a `Disallow` in `app/robots.ts`, and
         the distinction is not cosmetic: `Disallow` blocks *crawling*, so a
         crawler never fetches the page and never reads any noindex it carries,
         while a URL that is linked from somewhere else can still be indexed
         with no snippet. Refusing indexing requires the page to be fetchable
         and to say so on fetch, which is what `X-Robots-Tag` does. So robots.txt
         stays permissive here on purpose — do not "fix" it by adding a blanket
         Disallow, which would silently re-open the hole this closes.

         `missing` applies the header only when the host matches none of the
         listed values, so production is untouched. */
      {
        source: "/:path*",
        missing: canonicalHosts.map((value) => ({ type: "host" as const, value })),
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
