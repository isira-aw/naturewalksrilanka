import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { legacyRedirects } from "./lib/seo/redirects";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * The Content-Security-Policy, sent **Report-Only** for now.
 *
 * Report-Only is not hedging; it is the only responsible way to turn this on
 * from here. A CSP breaks a page by making a request vanish, and the two
 * flows most likely to trip it — the admin Google sign-in popup and the
 * traveller's email link — cannot be exercised without the real Firebase
 * project. Sent this way the browser reports what *would* have been blocked
 * and blocks nothing, so the policy can be proved against the live site
 * before it can cost anyone a sign-in. Promoting it is one header name, once
 * the reports are clean: `docs/security-headers.md` has the procedure.
 *
 * `script-src` allows `'unsafe-inline'`, which is worth being honest about:
 * it means this policy does not stop injected inline script. The alternative
 * is a per-request nonce, and a nonce has to be generated per request, which
 * makes every page dynamic — this site is almost entirely prerendered, and
 * trading that for a defence against an injection route the site does not
 * have (nothing here renders user-supplied HTML) is a bad bargain. What the
 * policy does buy is the rest: script may not be *loaded* from a host not
 * named here, the page cannot be framed, forms cannot post elsewhere, and
 * `connect-src` bounds where data can be sent.
 *
 * Every host below is one the application already talks to, and each is
 * listed once with the reason. Anything added to the app has to be added
 * here too, or it will appear in the reports.
 *
 * **One report is expected and is not a fault.** Zod probes for `Function("")`
 * once, to decide whether it may compile validators, and that probe is a
 * `script-src eval` report on the custom-tour page. The probe is wrapped in a
 * `try`/`catch` by Zod precisely so that a CSP can refuse it; when it does,
 * Zod validates the slower way and everything still works — the wizard was
 * walked end to end, and the PDF built, with this policy enforcing. Ignore it
 * in the reports, or set `z.config({ jitless: true })` to stop it being made.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  /* See above. `blob:` is jsPDF handing the finished document to the tab. */
  "script-src 'self' 'unsafe-inline' blob:",
  /* Next injects critical CSS inline, and `next/image` sets inline styles. */
  "style-src 'self' 'unsafe-inline'",
  /* Self-hosted by `next/font`; no external font host is used. */
  "font-src 'self'",
  [
    "img-src 'self' data: blob:",
    /* Every photograph on the site. */
    "https://res.cloudinary.com",
    /* Itineraries written before #27 still hold absolute Storage URLs. */
    "https://firebasestorage.googleapis.com https://*.firebasestorage.app",
    /* The wizard's map, and the one drawn into the PDF and Word documents. */
    "https://tile.openstreetmap.org",
  ].join(" "),
  [
    "connect-src 'self'",
    /* Signed uploads from the admin itinerary editor. */
    "https://api.cloudinary.com",
    /* Driving geometry for the journey map. */
    "https://router.project-osrm.org",
    "https://tile.openstreetmap.org",
    /* Firebase Auth: `identitytoolkit` and `securetoken`. Firestore is not
       here on purpose — the browser never talks to it. */
    "https://*.googleapis.com",
  ].join(" "),
  /* The Google sign-in popup and the Firebase auth handler it returns
     through. The handler lives on `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, which
     is a `firebaseapp.com` subdomain on a default project — the first thing
     to check in the reports if sign-in ever appears there. */
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
  /* Nothing on this site posts anywhere but back to it. The WhatsApp hand-off
     is a link, not a form, so it is not covered by this. */
  "form-action 'self'",
  /* This site is never framed, by anyone. Covers clickjacking of the admin
     panel, which `X-Frame-Options` would only half do. */
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    /* Photographs come from Cloudinary. `next/image` refuses any remote host
       that is not listed here — silently, from the page's point of view — so
       this is required, not an optimisation.

       The two Firebase Storage hosts are still listed, and deliberately.
       Nothing uploads to them any more, but a record written while images
       still lived there stores an absolute Storage URL, and dropping the
       host would blank those photographs rather than migrate them. They cost
       nothing to keep and can be removed once no record references them. */
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
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
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
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
