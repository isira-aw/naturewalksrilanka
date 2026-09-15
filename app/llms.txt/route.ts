import { getContent } from "@/lib/content/loader";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo/site";

/**
 * `/llms.txt` — the site in Markdown, for language models.
 *
 * The emerging convention (llmstxt.org): an H1 with the site's name, a
 * blockquote summarising it in one paragraph, then `##` sections of
 * `- [title](absolute url): description` links. It exists because a model
 * answering "who guides birding tours in Sri Lanka?" cannot render this site's
 * JavaScript or follow its navigation, and reading one plain-text index is
 * cheaper and more accurate than guessing from scraped HTML.
 *
 * Generated rather than written by hand, and from exactly the content files
 * the pages themselves render, so a tour or destination added to `content/`
 * appears here on the next build with no second place to remember. English
 * only: this is a summary for machines, not a page for visitors, and the other
 * four locales are translations of the same journeys.
 *
 * Served from a route handler, not `public/`, for that reason. The middleware
 * matcher in `proxy.ts` skips any path containing a dot, so this is reached at
 * `/llms.txt` and never rewritten to `/en/llms.txt`.
 */

/** Descriptions run to one line; a blockquote or list item that wraps is harder to parse. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function section(title: string, lines: string[]): string {
  return lines.length ? `## ${title}\n\n${lines.join("\n")}\n` : "";
}

export async function GET() {
  const locale = routing.defaultLocale;
  const [seo, profile, tours, destinations, navigation] = await Promise.all([
    getContent(locale, "seo"),
    getContent(locale, "profile"),
    getContent(locale, "tours"),
    getContent(locale, "destinations"),
    getContent(locale, "navigation"),
  ]);

  const base = `${SITE_URL}/${locale}`;

  const body = [
    `# ${seo.siteName}`,
    "",
    `> ${oneLine(seo.defaultDescription)}`,
    "",
    oneLine(
      `${seo.siteName} is a Sri Lankan tour operator founded by ${profile.name}, ` +
        `who guides personally and supplies the company's own Sri Lanka Tourism Board ` +
        `certified guides. Every journey is private — no fixed departures and no shared ` +
        `coaches — and accommodation and transport are arranged throughout. Enquiries ` +
        `are answered on WhatsApp rather than through a booking engine, and any date ` +
        `can be arranged because the guides are the company's own.`
    ),
    "",
    oneLine(
      `The site is published in English, Dutch, Spanish, Danish and Finnish. Every URL ` +
        `below is the English one; the same page in another language is the same path ` +
        `with the locale code swapped — for example ${SITE_URL}/nl/tours. The pages ` +
        `listed here are the complete set of public pages.`
    ),
    "",
    section("Main pages", [
      `- [Home](${base}): ${oneLine(seo.pages.home.description)}`,
      `- [Journeys](${base}/tours): ${oneLine(seo.pages.tours.description)}`,
      `- [Plan a custom tour](${base}/custom-tour): ${oneLine(seo.pages.customTour.description)}`,
      `- [Destinations](${base}/destinations): ${oneLine(seo.pages.destinations.description)}`,
      `- [About ${profile.name}](${base}/about-nandana): ${oneLine(seo.pages.aboutNandana.description)}`,
      `- [Contact](${base}/contact): ${oneLine(seo.pages.contact.description)}`,
      `- [Privacy policy](${base}/privacy): How enquiry details are handled.`,
    ]),
    section(
      "Journeys",
      tours.map(
        (tour) =>
          `- [${tour.title}](${base}/tours/${tour.slug}): ${tour.durationDays} days. ` +
          oneLine(tour.summary || tour.tagline)
      )
    ),
    section(
      "Destinations",
      destinations.map(
        (destination) =>
          `- [${destination.name}](${base}/destinations/${destination.slug}): ` +
          `${destination.region}. ${oneLine(destination.description)}`
      )
    ),
    section("Contact", [
      `- Email: ${navigation.contact.email}`,
      `- WhatsApp and phone: ${navigation.contact.phone}`,
      `- Address: ${navigation.contact.address}`,
    ]),
    section("Optional", [
      `- [Sitemap](${SITE_URL}/sitemap.xml): every page, in every language.`,
    ]),
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      /* Same shape as robots.txt and sitemap.xml: cheap to regenerate, read
         rarely, and nothing breaks if a crawler holds a day-old copy. */
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
