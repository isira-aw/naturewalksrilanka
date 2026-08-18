import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturewalksrilanka.com";

const staticPaths = [
  "",
  "/tours",
  "/custom-tour",
  "/about-nandana",
  "/destinations",
  "/contact",
  "/privacy",
];

function withAlternates(path: string) {
  return {
    url: `${SITE_URL}/${routing.defaultLocale}${path}`,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])
      ),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tours, destinations] = await Promise.all([
    getContent(routing.defaultLocale, "tours"),
    getContent(routing.defaultLocale, "destinations"),
  ]);

  const dynamicPaths = [
    ...tours.map((t) => `/tours/${t.slug}`),
    ...destinations.map((d) => `/destinations/${d.slug}`),
  ];

  return [...staticPaths, ...dynamicPaths].map((path) => ({
    ...withAlternates(path),
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
