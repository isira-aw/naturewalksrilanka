import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /* The admin tool is reached by typing its address, never by crawling to
         it. Saved trips are private to one traveller and carry a reference in
         the URL — nothing should be indexing those, quite apart from the
         sign-in that guards them. */
      disallow: [
        "/api/",
        "/admin",
        "/*/admin",
        "/my-trip",
        "/*/my-trip",
        /* A review link is a one-time credential. Crawling one would spend
           it, quite apart from indexing a page nobody else can use. */
        "/review",
        "/*/review",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
