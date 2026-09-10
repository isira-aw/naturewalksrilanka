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
};

export default withNextIntl(nextConfig);
