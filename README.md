# Nature Walks Sri Lanka

Next.js (App Router, TypeScript) rebuild of naturewalksrilanka.com — the private nature and wildlife tour company founded by Nandana Hewagamage, which supplies its own Sri Lanka Tourism Board certified guides and arranges accommodation and transport for every journey. English / Dutch / Spanish / Danish / Finnish, deployed to Vercel.

All the public content is file-based — per-locale JSON in `content/`, versioned in git. Firebase backs the dynamic parts only: the admin panel, itineraries, tour enquiries and customer reviews. See [Dynamic features](#dynamic-features-firebase).

## Getting started

**Node 22 is required**, not merely recommended — `firebase-admin@14` asks for it, and running below it returns 500 on every page of a deployment. `package.json` declares `engines: { "node": "22.x" }`, and the hosting project's own Node setting has to match.

```bash
npm install
npm run dev
```

The public site runs with no environment variables at all: every Firebase-backed feature reports itself unavailable rather than throwing, so the site builds and serves regardless. Optional variables:

| Variable | Effect when absent |
|---|---|
| The Firebase variables | The admin panel, saved trips and reviews are unavailable; the public site is unaffected |
| `ADMIN_*` (three of them) | Admin sign-in fails closed — **nobody can reach the panel** |
| `BLOB_READ_WRITE_TOKEN` | The itinerary archive reads as empty in local development |
| `GOOGLE_AI_API_KEY` | The admin translation panel returns 503; nothing else is affected |

`.env.example` is the authoritative list, with a comment per variable. Never commit real secrets — `.env` is gitignored.

## Dynamic features (Firebase)

Firestore, Firebase Auth and Firebase Storage back the admin panel, the itineraries it authors, custom-tour enquiries and the invited-and-moderated customer reviews.

- **[`docs/FIREBASE_INTEGRATION.md`](docs/FIREBASE_INTEGRATION.md)** — how it all works, every variable, and troubleshooting.
- **[`docs/FIREBASE_SETUP_CHECKLIST.md`](docs/FIREBASE_SETUP_CHECKLIST.md)** — the same steps as a tick-list.
- **[`docs/itinerary-storage.md`](docs/itinerary-storage.md)** — where itinerary records live and how to move them.

> **No Firebase project exists yet.** The code is written and merged but has never run against one, so treat all of it as unvalidated until `/api/admin/firebase-status` returns `{"configured": true, "reachable": true}`. The checklist is the order to do that in.

## Editing content

All text and tour/destination data lives in JSON, not in components:

```
content/
├── en/  { profile, tours, experiences, destinations, activities, testimonials, navigation, seo, ui }.json
├── nl/  (same file set, Dutch)
├── es/  (same file set, Spanish)
├── da/  (same file set, Danish)
├── fi/  (same file set, Finnish)
└── _translations/  tours.<locale>.json — prose overlays, see below
```

- `tours.json`, `experiences.json`, `destinations.json`, `activities.json` are arrays validated by `lib/content/schema.ts` (Zod) — the build fails if a required field is missing or misspelled.
- `ui.json` holds short interface strings (buttons, labels, form copy) loaded via `next-intl`.
- Any field with the literal value `"CONTENT_REQUIRED"`, or an object with `"contentRequired": true` / a `"_note"`, marks something that isn't a confirmed fact yet (e.g. Nandana's specific languages, the reconstructed 12-day itinerary) — resolve these with Nandana before treating that content as final.
- Non-English files carry `"_reviewStatus": "needs-native-review"` — a native speaker should proofread these before launch.

### Destination pages

`destinations.json` carries a short `description` plus an optional long-form
block used by the destination page: `intro`, `sections[]` (title + body),
`wildlife[]`, `facts[]` (label + value), `goodToKnow[]` and `gallery[]`.
Everything past `activities` is optional, so a locale holding only the short
description still validates and still renders a complete, shorter page. The
English file carries the full write-up, flagged
`"_reviewStatus": "draft-written-for-review"` — it is drafted copy awaiting
Nandana's review, not confirmed fact.

Photographs are named before they exist: each destination names its own files
in `destinations.json`, and anything not yet supplied falls back to the shared
placeholder (hero, cover) or is simply dropped (gallery), resolved in
`lib/content/images.ts`. Drop the real files in and redeploy — no content or
code change needed. Names, sizes and framing are in
[`docs/photography.md`](docs/photography.md).

### Adding or removing a language

`i18n/routing.ts` is the single source of truth: add the code to `locales`, add its endonym to `localeNames` (this is what the header/footer language selector shows), and add a matching `content/<locale>/` folder with the full file set. Nothing else enumerates languages.

### Prebuilt journey ideas (`experiences.json`)

One prebuilt itinerary idea belongs to **exactly one** interest category (`birding`, `wildlife`, `trekking`, `culture`, `beach`, `photography`, `adventure`). The custom-tour wizard shows the ideas matching whatever categories a visitor ticks, as small boxes with a "read more" dialog holding the photos, season, suggested length, description and the species or sights you might see.

**These are now authored in the admin panel, not in the content files.** Each one is a Firestore record, translated from the panel through Gemini, and rendered as an `Experience` by `lib/itineraries/toExperience.ts`. `content/<locale>/experiences.json` still exists, is still validated and is still merged in — but it is empty in every locale, and the wizard is fed from the admin panel instead. Add an entry there only if you want a journey idea that cannot be edited without a deploy.

Per-highlight photographs are supported either way: a highlight with an `image` renders it beside the name in the dialog, and one without renders as a lettered tile. Photographs attached in the admin panel go to Firebase Storage; a highlight authored in a content file names a path under `public/` — see [`docs/photography.md`](docs/photography.md).

### Generated translations

`content/<locale>/tours.json` is generated, not hand-edited. The English file owns the structure — slugs, day labels, `contentRequired` flags, image paths, destination and activity references — and `content/_translations/tours.<locale>.json` holds only that locale's prose. Rebuild after editing an overlay:

```bash
node scripts/build-translations.mjs
```

The script fails loudly if an overlay has the wrong number of highlights or itinerary days, so the locales cannot drift apart. Bird and mammal names stay in their international English names in every language — that is what field guides and checklists use, and guessing at endemic species names in five languages would introduce errors.

## Booking flow

There is no availability check: every journey is staffed from the company's own team of certified guides, so any date can be arranged. The custom-tour wizard collects the party size (1–12 travellers), arrival and departure dates from a month-grid calendar, interests, accommodation style and contact details, then hands the whole enquiry to WhatsApp.

The enquiry is *also* recorded to Firestore under a short reference like `NW-7K3QD`, so the traveller can reopen it at `/[locale]/my-trip/[reference]` — proving who they are with an email-link sign-in — and amend it. **Recording never blocks sending:** the write is fired without being awaited, and WhatsApp opens whether or not it succeeds. WhatsApp has been how this business receives enquiries for years; trading that for a new dependency would be a bad bargain.

Wizard progress is also autosaved to `localStorage` for 30 days, and offered back on return rather than restored silently.

## Photographs

Everything in `public/images/` goes through `scripts/optimize-images.mjs`, which caps the longest edge at 2400, re-encodes at quality 78, and regenerates the blur placeholder manifest at `lib/images/blurData.generated.ts`.

```bash
npm run optimize-images                        # dry run — reports what it would do
node scripts/optimize-images.mjs --commit      # actually rewrites the files
```

**Run it whenever photographs are added.** It is idempotent — a file already within the cap is left alone, and it refuses to write when the saving would be under ten per cent — so a second run rewrites nothing.

`lib/images/blurData.generated.ts` is generated. Do not edit it by hand.

**[`docs/photography.md`](docs/photography.md)** is the full reference: where each kind of photograph lives, what the code does when a file is missing, sizes and framing, and which images are still placeholders from the old site.

## SEO

Built in and generated from the content files, so a tour or destination added to `content/` is covered without a second place to remember:

| | Served at |
|---|---|
| Sitemap, all five locales, with hreflang alternates | `/sitemap.xml` |
| robots.txt, pointing at the sitemap | `/robots.txt` |
| llms.txt, so AI crawlers can summarise the site | `/llms.txt` |
| Per-page canonical, hreflang, Open Graph and Twitter card | every page |
| JSON-LD (`TravelAgency`, `TouristTrip`, `TouristAttraction`, `Person`, breadcrumbs) | home, tours, destinations, about |

The origin they all use is `SITE_URL` in `lib/seo/site.ts` — one constant, read from `NEXT_PUBLIC_SITE_URL`. Set that per environment (including previews, to the preview's own origin) and everything follows.

**[`docs/seo.md`](docs/seo.md)** has the detail, and the list of things only you can do after deployment: pasting the Google Search Console and Bing Webmaster Tools verification codes, and submitting the sitemap to both.

## Deployment

Deploy to Vercel as a standard Next.js app. Redirects from the old static site's URLs (`/single18.html` etc.) to the new locale-prefixed routes are configured in `next.config.ts` via `lib/seo/redirects.ts`.

**Set the project's Node version to 22.** The `engines` field does not rebuild a deployment that is already out there, and Node 20 returns 500 on every page — see [`docs/FIREBASE_INTEGRATION.md`](docs/FIREBASE_INTEGRATION.md) §0.

## What's out of scope for this build

- Connecting a real Firebase project and proving the code against it — **this is the next step**, and nothing else should be built until it is done. See the checklist.
- Final photography — several images are still reused from the old site or are generic placeholders; [`docs/photography.md`](docs/photography.md) lists which, and where each came from.
- Native-speaker review of the Dutch, Spanish, Danish and Finnish copy.
- The client's own prebuilt journey ideas and their photography, authored in the admin panel (see above).
- A localized privacy policy (currently English only) and its legal review.
- Domain/DNS cutover from the live `naturewalksrilanka.com`, and the search engine verification codes that depend on it — see [`docs/seo.md`](docs/seo.md).
- Analytics wiring.
