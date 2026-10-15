import { getContent } from "@/lib/content/loader";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo/site";

/**
 * `/llms-full.txt` — the site's substance in one Markdown file.
 *
 * `/llms.txt` is the index: what exists and where. This is the content itself —
 * every journey day by day, every destination in full, the guide's own story
 * and the answered questions — so that a model asked a specific question
 * ("what is on day 4 of the 10-day birding trip?", "when is the best time for
 * Yala?") can answer from one fetch instead of crawling thirty pages, and
 * quotes the operator's own wording rather than a paraphrase of a paraphrase.
 *
 * Generated from the same content files the pages render, English only, for
 * the reasons given in `llms.txt/route.ts`. Anything still marked as awaiting
 * the operator's answer is left out: a placeholder printed into a document
 * written for machines to repeat would be repeated.
 */

const PLACEHOLDER = "CONTENT_REQUIRED";

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** A usable string: present, not blank, and not the "operator has not answered yet" marker. */
function supplied(text: string | undefined): text is string {
  return Boolean(text && text.trim() && text.trim() !== PLACEHOLDER);
}

function bullets(items: string[] | undefined): string {
  const usable = (items ?? []).filter(supplied);
  return usable.length ? usable.map((item) => `- ${oneLine(item)}`).join("\n") : "";
}

export async function GET() {
  const locale = routing.defaultLocale;
  const [seo, profile, tours, destinations, faq, navigation] = await Promise.all([
    getContent(locale, "seo"),
    getContent(locale, "profile"),
    getContent(locale, "tours"),
    getContent(locale, "destinations"),
    getContent(locale, "faq"),
    getContent(locale, "navigation"),
  ]);

  const base = `${SITE_URL}/${locale}`;

  const tourBlocks = tours.map((tour) => {
    const days = tour.itinerary
      .map((day) => {
        const lines = [
          `#### ${day.day}: ${day.title} (${day.location})`,
          "",
          oneLine(day.description),
        ];
        const highlights = bullets(day.highlights);
        if (highlights) lines.push("", highlights);
        return lines.join("\n");
      })
      .join("\n\n");

    return [
      `### ${tour.title}`,
      `${base}/tours/${tour.slug}`,
      `${tour.durationDays} days. ${oneLine(tour.tagline)}`,
      oneLine(tour.summary),
      bullets(tour.highlights) && `Highlights:\n\n${bullets(tour.highlights)}`,
      bullets(tour.included) && `Included:\n\n${bullets(tour.included)}`,
      bullets(tour.excluded) && `Not included:\n\n${bullets(tour.excluded)}`,
      days && `Itinerary:\n\n${days}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  });

  const destinationBlocks = destinations.map((destination) => {
    const facts = (destination.facts ?? [])
      .filter((fact) => supplied(fact.value))
      .map((fact) => `- ${fact.label}: ${oneLine(fact.value)}`)
      .join("\n");
    const sections = (destination.sections ?? [])
      .filter((section) => supplied(section.body))
      .map((section) => `#### ${section.title}\n\n${oneLine(section.body)}`)
      .join("\n\n");

    return [
      `### ${destination.name}`,
      `${base}/destinations/${destination.slug}`,
      `Region: ${destination.region}.`,
      oneLine(destination.intro ?? destination.description),
      facts && `Key facts:\n\n${facts}`,
      bullets(destination.wildlife) && `Wildlife and sights:\n\n${bullets(destination.wildlife)}`,
      sections,
      bullets(destination.goodToKnow) && `Good to know:\n\n${bullets(destination.goodToKnow)}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  });

  const answered = faq.items.filter(
    (item) => !item.contentRequired && supplied(item.question) && supplied(item.answer),
  );
  const faqBlock = answered
    .map((item) => `### ${oneLine(item.question)}\n\n${oneLine(item.answer)}`)
    .join("\n\n");

  const body = [
    `# ${seo.siteName} — full content`,
    "",
    `> ${oneLine(seo.defaultDescription)}`,
    "",
    `This is the complete text of ${SITE_URL}, in English, for language models. ` +
      `The shorter index is at ${SITE_URL}/llms.txt. The site is also published in Dutch, ` +
      `Spanish, Danish and Finnish: the same page in another language is the same path ` +
      `with the locale code swapped, for example ${SITE_URL}/nl/tours.`,
    "",
    "## About the company",
    "",
    oneLine(
      `${seo.siteName} is a private tour operator in Sri Lanka founded in 2017 by ` +
        `${profile.name}. Every journey is private, with no fixed departures and no shared ` +
        `coaches, and is led by ${profile.name} or one of the company's own guides, who are ` +
        `certified by the Sri Lanka Tourism Board. Accommodation and transport are arranged ` +
        `throughout. Enquiries are handled on WhatsApp, not through an online booking engine.`,
    ),
    "",
    `### ${profile.name}`,
    "",
    oneLine(profile.story),
    "",
    `Specialities: ${profile.specialties.join(", ")}.`,
    "",
    "## Journeys",
    "",
    tourBlocks.join("\n\n"),
    "",
    "## Destinations",
    "",
    destinationBlocks.join("\n\n"),
    "",
    faqBlock && `## Frequently asked questions\n\n${faqBlock}`,
    "",
    "## Contact",
    "",
    `- Email: ${navigation.contact.email}`,
    `- WhatsApp and phone: ${navigation.contact.phone}`,
    `- Address: ${navigation.contact.address}`,
    `- Plan a custom journey: ${base}/custom-tour`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
