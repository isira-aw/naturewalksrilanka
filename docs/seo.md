# SEO and search engine setup

What is already built into the site, and what you have to do by hand once it is
deployed to `https://naturewalksrilanka.com/`.

**The site is not on that domain yet.** Nothing below hardcodes it more than
once: everything derives from `SITE_URL` in [`lib/seo/site.ts`](../lib/seo/site.ts),
which reads `NEXT_PUBLIC_SITE_URL` and falls back to the production domain. Set
that variable per environment and every canonical link, hreflang alternate,
sitemap entry, `og:url`, JSON-LD `url` and the `llms.txt` links follow it.

> Set `NEXT_PUBLIC_SITE_URL` on preview deployments too, to the preview's own
> origin. A preview that claims the production origin invites Google to index
> the preview in place of the real site.

---

## What is already in place

| Thing | Where | Served at |
|---|---|---|
| Sitemap, all locales, with hreflang alternates | [`app/sitemap.ts`](../app/sitemap.ts) | `/sitemap.xml` |
| robots.txt, pointing at the sitemap | [`app/robots.ts`](../app/robots.ts) | `/robots.txt` |
| llms.txt for AI crawlers | [`app/llms.txt/route.ts`](../app/llms.txt/route.ts) | `/llms.txt` |
| Per-page title, description, canonical, hreflang, Open Graph and Twitter card | [`lib/seo/metadata.ts`](../lib/seo/metadata.ts) | every page |
| JSON-LD structured data | [`lib/seo/jsonld.ts`](../lib/seo/jsonld.ts) | home, tours, destinations, about |
| Redirects from the old static site's URLs | [`lib/seo/redirects.ts`](../lib/seo/redirects.ts) | `next.config.ts` |
| Search Console and Bing verification tags | [`app/layout.tsx`](../app/layout.tsx) | `<head>`, when the env vars are set |

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

- [ ] `NEXT_PUBLIC_SITE_URL=https://naturewalksrilanka.com` in the Vercel
      project's **Production** environment (no trailing slash)
- [ ] Redeploy, then check `https://naturewalksrilanka.com/robots.txt` — the
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
       set it in Vercel as:

       NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<paste the code here>

       Redeploy, confirm the tag is in the page source (view-source, search for
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
       `content="..."`, and set it in Vercel as:

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
- **Analytics.** Nothing is wired up. Search Console gives you search traffic;
  it does not give you on-site behaviour.
- **A localized privacy policy.** The page is English-only and is marked in the
  copy as pending legal review.
