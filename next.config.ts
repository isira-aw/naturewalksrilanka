import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { legacyRedirects } from "./lib/seo/redirects";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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
      {
        /* Photographs served straight out of `public/`, rather than through
           the optimiser at `/_next/image`. Next gives everything in `public/`
           `max-age=0` because it cannot know when a file changes, so each of
           these costs a revalidation round trip per visit. They are not
           content-hashed either, so `immutable` would be wrong — a replaced
           photograph would go on being served from cache for a year.

           This is the middle ground: an hour in the browser, a day at the CDN,
           and a week in which a stale copy is served instantly while a fresh
           one is fetched behind it. A photograph swapped by hand is live
           everywhere within a day with no cache purge, and no visitor ever
           waits for one.

           The paths that reach this rule are the Open Graph card fetched by
           crawlers, the logo, the language switcher's flags under
           `/images/flags/`, and the images embedded in the PDF and Word
           documents the wizard builds. Everything rendered by `Photo` goes
           through the optimiser instead, which sets its own long-lived headers
           from `images.minimumCacheTTL` above. */
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
