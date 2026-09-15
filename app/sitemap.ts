import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { SITE_URL } from "@/lib/seo/site";

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
      languages: {
        ...Object.fromEntries(
          routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])
        ),
        /* Without an x-default, a visitor whose language matches none of the
           five has no declared page to be sent to, and Google picks one for
           itself. The English URL is the same one `url` above submits. */
        "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
      },
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
