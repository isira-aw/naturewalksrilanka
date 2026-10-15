# SEO and search engine setup

What is already built into the site, and what you have to do by hand once it is
deployed to `https://naturewalksrilanka.com/` on Firebase App Hosting
([`app-hosting.md`](app-hosting.md)).

Nothing below hardcodes the domain more than once: everything derives from
`SITE_URL` in [`lib/seo/site.ts`](../lib/seo/site.ts), which reads
`NEXT_PUBLIC_SITE_URL` (set in [`apphosting.yaml`](../apphosting.yaml)) and
falls back to the production domain. Every canonical link, hreflang alternate,
sitemap entry, `og:url`, JSON-LD `url` and the `llms.txt` links follow it.

> A test deployment must use its own origin in `NEXT_PUBLIC_SITE_URL`, not the
> production one. One that claims the production origin invites Google to index
> it in place of the real site.

**One domain, enforced.** `www.naturewalksrilanka.com` and the backend's default
`*.hosted.app` address both 301 to `https://naturewalksrilanka.com`
([`proxy.ts`](../proxy.ts)). Without that, each would be a second copy of every
page and would split the ranking between them.

---

## What is already in place

| Thing | Where | Served at |
|---|---|---|
| Sitemap, all locales, with hreflang alternates | [`app/sitemap.ts`](../app/sitemap.ts) | `/sitemap.xml` |
| robots.txt: explicit rules for AI search and assistant crawlers, pointing at the sitemap | [`app/robots.ts`](../app/robots.ts) | `/robots.txt` |
| llms.txt — the index, for AI crawlers | [`app/llms.txt/route.ts`](../app/llms.txt/route.ts) | `/llms.txt` |
| llms-full.txt — every journey day by day, every destination, the answered FAQ | [`app/llms-full.txt/route.ts`](../app/llms-full.txt/route.ts) | `/llms-full.txt` |
| Per-page title, description, canonical, hreflang, Open Graph and Twitter card | [`lib/seo/metadata.ts`](../lib/seo/metadata.ts) | every page |
| JSON-LD structured data | [`lib/seo/jsonld.ts`](../lib/seo/jsonld.ts) | home, tours, destinations, about |
| Redirects from the old static site's URLs | [`lib/seo/redirects.ts`](../lib/seo/redirects.ts) | `next.config.ts` |
| Search Console and Bing verification tags | [`app/layout.tsx`](../app/layout.tsx) | `<head>`, when the env vars are set |

### Generative engine optimisation (GEO)

Making the business something an AI assistant can find, read and recommend, as
opposed to a search result a person clicks.

- **Crawlers are let in, by name.** `robots.txt` has a group for the AI search,
  assistant and training agents (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot,
  Claude-SearchBot, Claude-User, PerplexityBot, Google-Extended, Applebot-Extended
  and others). That is a decision, not a default: a tour operator is
  recommended by an assistant that has read it. The comment in `app/robots.ts`
  says how to opt out of *training* while staying visible in AI *search*.
- **`/llms.txt` and `/llms-full.txt`.** The index and the full text. The long one
  lets a model answer "what happens on day 4?" from one fetch, in the operator's
  own words.
- **One connected entity, not loose snippets.** The `TravelAgency`, its founder
  `Person`, the `WebSite` and every `TouristTrip` refer to each other by `@id`
  (`ORGANIZATION_ID`, `FOUNDER_ID`, `WEBSITE_ID` in `lib/seo/jsonld.ts`). It
  states, from the content files, that the business was founded in 2017 by
  Nandana Hewagamage, serves Sri Lanka, and that he holds a Sri Lanka Tourism
  Board certification. Each trip carries its itinerary as an ordered
  `ItemList` and names the agency as its provider.
- **`FAQPage` markup on the contact page**, matching the visible questions
  exactly. Google no longer shows the rich result for a site like this and
  ignores the markup; Bing, voice assistants and language models read it.
  Questions still awaiting the operator's answer are neither shown nor marked up.
- **Snippet permissions.** The root `robots` meta sets `max-snippet:-1` and
  `max-image-preview:large`, which is what allows full-length snippets and large
  image previews, in Google and in AI-generated answers.
- **Image sitemap entries** for every tour and destination hero.

The same markup is what carries the *geographic* signal for a business sold into
five countries: `hreflang` for the five languages, `areaServed` and
`containedInPlace` for Sri Lanka.

### Sitemap

Generated, not written. It reads the same content files the pages render, so a
tour or destination added to `content/` appears in the sitemap on the next
build with nothing else to remember. Every URL carries `hreflang` alternates
for all five locales plus an `x-default` pointing at the English page.

Pages deliberately **left out**, because they should never be indexed: the
admin panel, a traveller's saved trip (`/my-trip/...`, private to one person)
and a review link (`/review/...`, a one-time credential that crawling would
spend). `robots.txt` disallows the same set.

### Open Graph and Twitter cards

Every page gets its own title, description and image from its own content —
not one generic site-wide tag. A tour or destination page shares its own hero
photograph; the section pages share `og:image` from `content/<locale>/seo.json`.

The card is `summary_large_image`, and `public/images/og-default.jpg` is
1200 × 630. See [`photography.md`](photography.md) before replacing it.

### Structured data

| Page | Type |
|---|---|
| Home | `TravelAgency` + `WebSite` |
| Tour detail | `TouristTrip` + `BreadcrumbList` |
| Destination detail | `TouristAttraction` + `BreadcrumbList` |
| About Nandana | `Person` + `BreadcrumbList` |
| Contact | `FAQPage` + `BreadcrumbList` |

The `TravelAgency` block carries an `aggregateRating` **only** when at least
three approved reviews exist (`lib/reviews/published.ts` withholds it below
that). Marking up a rating that is not genuine is a manual-action offence, not
merely bad manners.

Two things are deliberately **not** marked up, because the data to do it
honestly does not exist yet:

- **Prices.** No tour carries one, so no `Offer` is emitted.
- **Opening hours and geo coordinates** on destinations. `TouristAttraction`
  supports both; inventing either would be worse than omitting them.

---

## Manual steps after deployment

Nothing in this section can be done from the repository. Each one needs a code
or a login that only you have.

### 1. Set the site URL

- [ ] `NEXT_PUBLIC_SITE_URL=https://naturewalksrilanka.com` in
      `apphosting.yaml` (no trailing slash)
- [ ] Push a new rollout, then check `https://naturewalksrilanka.com/robots.txt` — the
      `Sitemap:` line must name the real domain

### 2. Google Search Console

1. [ ] Open [search.google.com/search-console](https://search.google.com/search-console)
       and **Add property**.
2. [ ] Choose **Domain** if you can edit DNS (it covers every subdomain and
       both http and https), otherwise **URL prefix** with
       `https://naturewalksrilanka.com/`.
3. [ ] For a **Domain** property, add the TXT record it gives you at your DNS
       provider and press Verify. There is nothing to change in this repository.
4. [ ] For a **URL prefix** property, choose the **HTML tag** method. Copy only
       the value inside `content="..."`, not the whole `<meta>` element, and
       add it to `apphosting.yaml` (the commented block is there; availability
       `BUILD` and `RUNTIME`) as:

       NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<paste the code here>

       Push a rollout, confirm the tag is in the page source (view-source, search for
       `google-site-verification`), then press Verify.
5. [ ] **Sitemaps** → submit `sitemap.xml`. Enter the path, not the full URL.
6. [ ] **URL Inspection** → paste `https://naturewalksrilanka.com/en` →
       **Request indexing**. Do the same for `/en/tours` and
       `/en/custom-tour` to get the important pages crawled first.
7. [ ] **Settings → Users and permissions** — add anyone else who needs access.

> An HTML **file** works too if you would rather not use a meta tag: download
> the `google<code>.html` file Search Console offers and drop it in `public/`.
> It is then served at `https://naturewalksrilanka.com/google<code>.html`
> untouched — files in `public/` are served at the site root as-is. The meta
> tag is preferred because it does not need a commit for each property.

### 3. Bing Webmaster Tools

1. [ ] Open [bing.com/webmasters](https://www.bing.com/webmasters) and
       **Add a site**.
2. [ ] The quickest route is **Import from Google Search Console**, which
       carries the verification and the sitemap across in one step. Do that if
       step 2 is done.
3. [ ] Otherwise choose **HTML Meta Tag**, copy the value inside
       `content="..."`, and add it to `apphosting.yaml` as:

       NEXT_PUBLIC_BING_SITE_VERIFICATION=<paste the code here>

       Redeploy, confirm `msvalidate.01` is in the page source, then Verify.
4. [ ] **Sitemaps** → submit `https://naturewalksrilanka.com/sitemap.xml`.
       It is the same sitemap; there is no Bing-specific one to generate.

### 4. Check the work

- [ ] [Rich Results Test](https://search.google.com/test/rich-results) on the
      home page, one tour page and one destination page
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
      on the home page — confirm the card shows the right title, description
      and a 1200 × 630 image
- [ ] Paste a tour URL into a WhatsApp chat with yourself and confirm the
      preview is that tour's own photograph, not the generic card
- [ ] `https://naturewalksrilanka.com/llms.txt` loads as plain text and its
      links point at the real domain
- [ ] `https://naturewalksrilanka.com/sitemap.xml` lists every tour and
      destination in all five languages

### 5. Still outstanding, and deliberately not invented

These need real information from the business before they can be added
honestly. None of them blocks launch.

- **Business details for the `TravelAgency` markup.** The address, phone and
  email come from `content/<locale>/navigation.json` and are real. Opening
  hours, a price range and geo coordinates are not set, because nobody has
  supplied them.
- **Analytics.** Nothing is wired up, and that is a decision rather than an
  omission: Search Console gives you search traffic, and the site sets no
  cookie at all until somebody signs in, so there is no consent banner to
  build. What is given up is on-site behaviour. Picking a cookieless provider
  later (Plausible, Fathom) keeps it that way; GA4 would bring a
  consent banner with it.
- **A localized privacy policy.** The page is English-only and is marked in the
  copy as pending legal review.
