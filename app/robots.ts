import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The admin tool is reached by typing its address, never by crawling to it.
      disallow: ["/api/", "/admin", "/*/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
