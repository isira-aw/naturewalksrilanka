import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content/loader";

/**
 * The search index for one locale.
 *
 * Served from a route rather than embedded in every page because the whole
 * index is a few tens of kilobytes of prose, and almost nobody searches. The
 * dialog fetches it once, on first open, and keeps it for the rest of the
 * session — so the cost lands on the visitor who actually wants it, not on
 * every visitor's first paint.
 *
 * There is no database behind this. The content files are the source, and
 * they are fixed at build time, which is why the response can be cached hard.
 * Adding a tour or destination to `content/` changes the index on the next
 * deploy with nothing else to update.
 *
 * Field names are single letters to keep the payload small: `t` title,
 * `s` subtitle, `h` href, `k` the lowercased haystack that is actually
 * matched against.
 */

export type SearchDoc = {
  t: string;
  s: string;
  h: string;
  k: string;
  /** Section label, so results can be grouped in the dialog. */
  g: "tour" | "destination" | "activity" | "page";
};

/** One lowercase blob per document. Matching is done on this, not on display text. */
function haystack(...parts: (string | string[] | undefined)[]): string {
  return parts
    .flat()
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase();
}

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") ?? routing.defaultLocale;
  if (!hasLocale(routing.locales, locale)) {
    return NextResponse.json({ error: "unknown_locale" }, { status: 400 });
  }
  const l = locale as Locale;

  const [tours, destinations, activities, seo] = await Promise.all([
    getContent(l, "tours"),
    getContent(l, "destinations"),
    getContent(l, "activities"),
    getContent(l, "seo"),
  ]);

  const docs: SearchDoc[] = [
    ...tours.map((tour) => ({
      g: "tour" as const,
      t: tour.title,
      s: tour.tagline || tour.summary,
      h: `/${l}/tours/${tour.slug}`,
      k: haystack(
        tour.title,
        tour.tagline,
        tour.summary,
        tour.highlights,
        tour.itinerary?.map((day) => `${day.location} ${day.description}`),
      ),
    })),

    ...destinations.map((destination) => ({
      g: "destination" as const,
      t: destination.name,
      s: destination.region,
      h: `/${l}/destinations/${destination.slug}`,
      k: haystack(
        destination.name,
        destination.region,
        destination.description,
        destination.intro,
        destination.wildlife,
        destination.sections?.map((section) => `${section.title} ${section.body}`),
      ),
    })),

    ...activities.map((activity) => ({
      g: "activity" as const,
      t: activity.name,
      s: activity.description,
      h: `/${l}/destinations`,
      k: haystack(activity.name, activity.description),
    })),

    /* The section pages, so searching "contact" or "about" lands somewhere
       rather than returning nothing. Titles come from the same `seo.pages`
       block the pages themselves use, so they stay in step and translated. */
    ...Object.entries({
      "": seo.pages.home,
      "/tours": seo.pages.tours,
      "/destinations": seo.pages.destinations,
      "/custom-tour": seo.pages.customTour,
      "/about-nandana": seo.pages.aboutNandana,
      "/contact": seo.pages.contact,
    })
      .filter(([, page]) => Boolean(page))
      .map(([path, page]) => ({
        g: "page" as const,
        t: page.title,
        s: page.description,
        h: `/${l}${path}`,
        k: haystack(page.title, page.description),
      })),
  ];

  return NextResponse.json(
    { docs },
    {
      headers: {
        /* Fixed at build time, so a stale copy is impossible within a
           deployment and cheap to revalidate across one. */
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
