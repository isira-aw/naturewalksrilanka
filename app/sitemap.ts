import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

const staticPaths = [
  "",
  "/tours",
  "/custom-tour",
  "/about-nandana",
  "/destinations",
  "/contact",
  "/privacy",
];

function withAlternates(path: string, image?: string) {
  return {
    url: `${SITE_URL}/${routing.defaultLocale}${path}`,
    /* The page's own photograph, so it can be found in image search. For a
       wildlife and landscape business that is a real source of visitors, and
       it costs one line per page. */
    ...(image ? { images: [absoluteUrl(image)] } : {}),
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
    ...tours.map((t) => ({ path: `/tours/${t.slug}`, image: t.heroImage })),
    ...destinations.map((d) => ({
      path: `/destinations/${d.slug}`,
      image: d.heroImage ?? d.image,
    })),
  ];

  /* No `lastModified`. It used to be `new Date()`, which told every crawler
     that every URL had changed the moment it asked — a claim that is never
     true and that search engines discount accordingly, taking the rest of the
     entry's credibility with it. Nothing here carries a real timestamp: the
     content files have none, and a build date would be the same wrong answer
     with extra steps. An omitted field is honest and is treated as "unknown",
     which is what it is. Give it a real date only when the content it
     describes starts carrying one. */
  return [...staticPaths.map((path) => ({ path, image: undefined })), ...dynamicPaths].map(
    ({ path, image }) => ({
      ...withAlternates(path, image),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
    }),
  );
}
