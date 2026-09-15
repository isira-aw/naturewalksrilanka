import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/routing";
import type { Seo } from "@/lib/content/schema";
import { absoluteUrl } from "./site";

/**
 * One builder for every page's metadata.
 *
 * Nine pages were each assembling the same four blocks by hand — canonical,
 * hreflang, Open Graph, and (on none of them) a Twitter card. Copies drift:
 * the privacy page had no Open Graph at all, and no page declared `og:url`,
 * `og:type` or `og:site_name`, so a link to any of them unfurled as a bare
 * title. Adding a tag in one place is now the whole job.
 *
 * Page-specific content is the point — `title`, `description` and `image` all
 * come from the caller, out of the per-locale content files, not from one
 * generic site-wide string.
 */

/**
 * `og:locale` wants a language_TERRITORY pair, not a bare language. The
 * territory is the market each locale is sold to, matching the country flags
 * the language selector shows.
 */
const ogLocales: Record<Locale, string> = {
  en: "en_GB",
  nl: "nl_NL",
  es: "es_ES",
  da: "da_DK",
  fi: "fi_FI",
};

/**
 * The dimensions of `public/images/og-default.jpg`, which is cut to the size
 * Facebook, LinkedIn, WhatsApp and X all document for a large card.
 *
 * Declared only for that file. A tour or destination hero is a photograph of
 * whatever shape it was shot in, and stating dimensions we have not measured
 * is worse than stating none: a crawler that trusts a wrong `og:image:width`
 * lays out the card wrongly, where one given no dimensions simply fetches the
 * image and measures it.
 */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export function pagePath(locale: string, path: string): string {
  return `/${locale}${path}`;
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  seo,
  image,
  imageAlt,
  type = "website",
}: {
  locale: Locale;
  /** Locale-relative and leading-slashed, or `""` for the home page. */
  path: string;
  title: string;
  description: string;
  seo: Seo;
  /** Root-relative path to the page's own photograph; falls back to the site card. */
  image?: string;
  imageAlt?: string;
  /** `article` for a single tour or destination, `website` for an index. */
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(pagePath(locale, path));
  const src = image ?? seo.ogImage;
  const isDefaultCard = src === seo.ogImage;

  const ogImage = {
    url: absoluteUrl(src),
    alt: imageAlt ?? title,
    ...(isDefaultCard ? { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT } : {}),
  };

  return {
    title,
    description,
    alternates: {
      canonical: pagePath(locale, path),
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, pagePath(l, path)])),
        /* A visitor whose language is none of the five has no declared page
           without this, and the search engine picks one for itself. */
        "x-default": pagePath("en", path),
      },
    },
    openGraph: {
      type,
      url,
      siteName: seo.siteName,
      title,
      description,
      locale: ogLocales[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocales[l]),
      images: [ogImage],
    },
    twitter: {
      /* The photograph is the reason anyone clicks a link to a tour company;
         `summary` would crop it to a thumbnail beside the text. */
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
