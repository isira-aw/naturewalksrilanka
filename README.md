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
- **[`handoff.md`](handoff.md)** — why each decision was made, and what is still unproven.

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

Photographs are named before they exist. Each destination asks for
`/images/destinations/<slug>/hero.jpg`, `cover.jpg` and `01.jpg`–`04.jpg`;
anything not yet supplied falls back to the shared placeholder (hero, cover) or
is simply dropped (gallery), resolved in `lib/content/images.ts`. Drop the real
files in and redeploy — no content or code change needed. Sizes and framing are
documented in `public/images/destinations/README.md`.

### Adding or removing a language

`i18n/routing.ts` is the single source of truth: add the code to `locales`, add its endonym to `localeNames` (this is what the header/footer language selector shows), and add a matching `content/<locale>/` folder with the full file set. Nothing else enumerates languages.

### Prebuilt journey ideas (`experiences.json`)

Each entry is one prebuilt itinerary idea belonging to **exactly one** interest category (`birding`, `wildlife`, `trekking`, `culture`, `beach`, `photography`, `adventure`). The custom-tour wizard shows the entries matching whatever categories a visitor ticks, as small boxes with a "read more" dialog holding the photos, season, suggested length, description and the species or sights you might see.

Author a separate entry per category rather than tagging one entry as "wildlife + photography" — one entry, one category is what keeps the matching honest.

Two things to know when replacing the current set:

- **Every entry is placeholder.** They were written from the destinations and activities already on the site so the wizard has something real-shaped to show, and each carries `"contentRequired": true`. Swap in the client's own prebuilt itineraries.
- **Per-highlight photos are supported but not supplied.** Add an `image` to a highlight (`{ "name": "Sri Lanka Blue Magpie", "image": "/images/birds/blue-magpie.jpg" }`) and the dialog renders it beside the name — that is where the bird photographs belong. Without one the highlight is text only, which is how it renders today.

### Generated translations

`content/<locale>/tours.json` and `content/<locale>/experiences.json` are generated, not hand-edited. The English files own the structure — slugs, categories, day labels, `contentRequired` flags, image paths, destination and activity references — and `content/_translations/<file>.<locale>.json` holds only that locale's prose. Rebuild after editing an overlay:

```bash
node scripts/build-translations.mjs
```

The script fails loudly if an overlay has the wrong number of highlights or itinerary days, so the locales cannot drift apart. Bird and mammal names stay in their international English names in every language.

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

**Run it whenever photographs are added.** It is idempotent — a file already within the cap is left alone, and it refuses to write when the saving would be under ten per cent — so a second run rewrites nothing. A file that never goes through it simply has no blur placeholder, which is not an error but is a missed opportunity.

`lib/images/blurData.generated.ts` is generated. Do not edit it by hand.

Two things the script reports rather than fixes, because both mean changing a file name and therefore every reference to it: opaque PNGs that should be JPEGs, and names with characters that need escaping in a URL.

## Deployment

Deploy to Vercel as a standard Next.js app. Redirects from the old static site's URLs (`/single18.html` etc.) to the new locale-prefixed routes are configured in `next.config.ts` via `lib/seo/redirects.ts`.

**Set the project's Node version to 22.** The `engines` field does not rebuild a deployment that is already out there, and Node 20 returns 500 on every page — see [`docs/FIREBASE_INTEGRATION.md`](docs/FIREBASE_INTEGRATION.md) §0.

## What's out of scope for this build

- Connecting a real Firebase project and proving the code against it — **this is the next step**, and nothing else should be built until it is done. See the checklist.
- Final photography — images currently reused from the old site or generic placeholders; see `lib/content/imageMap.ts` for what to swap.
- Native-speaker review of the Dutch, Spanish, Danish and Finnish copy.
- The client's own prebuilt journey ideas and their photography, replacing the placeholder set in `experiences.json` (see above).
- A localized privacy policy (currently English only) and its legal review.
- Domain/DNS cutover from the live `naturewalksrilanka.com`.
- Analytics wiring.
