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
├── en/  { profile, tours, destinations, activities, testimonials, navigation, seo, ui }.json
├── nl/  (same file set, Dutch)
├── es/  (same file set, Spanish)
├── da/  (same file set, Danish)
├── fi/  (same file set, Finnish)
└── _translations/  tours.<locale>.json — prose overlays, see below
```

- `tours.json`, `destinations.json`, `activities.json` are arrays validated by `lib/content/schema.ts` (Zod) — the build fails if a required field is missing or misspelled.
- `ui.json` holds short interface strings (buttons, labels, form copy) loaded via `next-intl`.
- Any field with the literal value `"CONTENT_REQUIRED"`, or an object with `"contentRequired": true` / a `"_note"`, marks something that isn't a confirmed fact yet (e.g. Nandana's specific languages, the reconstructed 12-day itinerary) — resolve these with Nandana before treating that content as final.
- Non-English files carry `"_reviewStatus": "needs-native-review"` — a native speaker should proofread these before launch.

### Adding or removing a language

`i18n/routing.ts` is the single source of truth: add the code to `locales`, add its endonym to `localeNames` (this is what the header/footer language selector shows), and add a matching `content/<locale>/` folder with the full file set. Nothing else enumerates languages.

### Tour translations

`content/<locale>/tours.json` is generated, not hand-edited. `content/en/tours.json` owns the structure — slugs, day labels, `contentRequired` flags, image paths, destination and activity references — and `content/_translations/tours.<locale>.json` holds only that locale's prose. Rebuild after editing an overlay:

```bash
node scripts/build-tour-translations.mjs
```

The script fails loudly if an overlay has the wrong number of highlights or itinerary days, so the locales cannot drift apart. Bird and mammal names inside `itinerary[].highlights` stay in their international English names in every language.

## Booking flow

There is no availability check: every journey is staffed from the company's own team of certified guides, so any date can be arranged. The custom-tour wizard collects arrival and departure dates as plain input and hands the whole enquiry to WhatsApp.

## Deployment

Deploy to Vercel as a standard Next.js app. Redirects from the old static site's URLs (`/single18.html` etc.) to the new locale-prefixed routes are configured in `next.config.ts` via `lib/seo/redirects.ts`.

## What's out of scope for this build

- Final photography — images currently reused from the old site or generic placeholders; see `lib/content/imageMap.ts` for what to swap.
- Native-speaker review of the Dutch, Spanish, Danish and Finnish copy.
- A localized privacy policy (currently English only) and its legal review.
- Domain/DNS cutover from the live `naturewalksrilanka.com`.
- Analytics wiring.
