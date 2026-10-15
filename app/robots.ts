import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/* The admin tool is reached by typing its address, never by crawling to it.
   Saved trips are private to one traveller and carry a reference in the URL —
   nothing should be indexing those, quite apart from the sign-in that guards
   them. */
const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/*/admin",
  "/my-trip",
  "/*/my-trip",
  /* A review link is a one-time credential. Crawling one would spend it, quite
     apart from indexing a page nobody else can use. */
  "/review",
  "/*/review",
];

/**
 * Crawlers that fetch pages to *answer people's questions* — AI search and
 * assistants — plus the ones that train the models behind them.
 *
 * They are named, and allowed, on purpose. A private tour operator is found by
 * somebody asking an assistant "who can guide a birding trip in Sri Lanka?",
 * and an assistant can only recommend a business it has read. Blocking these
 * is the right call for a publisher selling its text; it is the wrong one for a
 * business selling a service the text describes.
 *
 * Every name here already falls under `*`, so listing them changes nothing for
 * a crawler that honours the wildcard. It is listed anyway so that the intent
 * is on record and can be audited, and because a crawler matching a *named*
 * group ignores `*` entirely — which is why the private paths are repeated in
 * this group rather than assumed.
 *
 * To opt out of model *training* while staying visible in AI *search*, move
 * `GPTBot`, `Google-Extended`, `Applebot-Extended`, `CCBot` and `ClaudeBot` into
 * their own group with `disallow: "/"`, and leave the search and user-initiated
 * agents (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`,
 * `PerplexityBot`) here.
 */
const AI_CRAWLERS = [
  /* OpenAI: training, search index, and a user asking ChatGPT to open a link. */
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  /* Anthropic: training, search, and a user asking Claude to open a link. */
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  /* Perplexity. */
  "PerplexityBot",
  "Perplexity-User",
  /* Google's opt-in control for Gemini training and grounding. It is a robots.txt
     token only; it does not crawl, and Googlebot's indexing is unaffected. */
  "Google-Extended",
  /* Apple Intelligence; likewise a control token rather than a separate crawler. */
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
