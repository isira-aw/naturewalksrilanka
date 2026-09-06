# Nature Walks Sri Lanka

Next.js (App Router, TypeScript) rebuild of naturewalksrilanka.com — the private nature and wildlife tour company founded by Nandana Hewagamage, which supplies its own Sri Lanka Tourism Board certified guides and arranges accommodation and transport for every journey. English / Dutch / Spanish / Danish / Finnish, no database, deployed to Vercel.

## Getting started

```bash
npm install
npm run dev
```

The site needs no environment variables to run. The one optional variable is `GOOGLE_AI_API_KEY`, which enables the AI itinerary step in the custom-tour wizard; without it that step is simply not shown.

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

There is no availability check: every journey is staffed from the company's own team of certified guides, so any date can be arranged. The custom-tour wizard collects the party size (1–12 travellers), arrival and departure dates from a month-grid calendar, interests, accommodation style and contact details, then hands the whole enquiry to WhatsApp. Nothing is stored server-side.

## Deployment

Deploy to Vercel as a standard Next.js app. Redirects from the old static site's URLs (`/single18.html` etc.) to the new locale-prefixed routes are configured in `next.config.ts` via `lib/seo/redirects.ts`.

## What's out of scope for this build

- Final photography — images currently reused from the old site or generic placeholders; see `lib/content/imageMap.ts` for what to swap.
- Native-speaker review of the Dutch, Spanish, Danish and Finnish copy.
- The client's own prebuilt journey ideas and their photography, replacing the placeholder set in `experiences.json` (see above).
- A localized privacy policy (currently English only) and its legal review.
- Domain/DNS cutover from the live `naturewalksrilanka.com`.
- Analytics wiring.
