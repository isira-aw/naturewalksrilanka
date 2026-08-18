# Nature Walks Sri Lanka

Next.js (App Router, TypeScript) rebuild of naturewalksrilanka.com — private nature and wildlife tours guided by Nandana Hewagamage. English / German / French, no database, deployed to Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Google Calendar credentials when available
npm run dev
```

The site runs without any `.env.local` values — the availability calendar just shows "we couldn't check availability" and falls back to WhatsApp until Google Calendar credentials are supplied.

## Editing content

All text and tour/destination data lives in JSON, not in components:

```
content/
├── en/  { profile, tours, destinations, activities, testimonials, navigation, seo, ui }.json
├── de/  (same file set, German)
└── fr/  (same file set, French)
```

- `tours.json`, `destinations.json`, `activities.json` are arrays validated by `lib/content/schema.ts` (Zod) — the build fails if a required field is missing or misspelled.
- `ui.json` holds short interface strings (buttons, labels, form copy) loaded via `next-intl`.
- Any field with the literal value `"CONTENT_REQUIRED"`, or an object with `"contentRequired": true` / a `"_note"`, marks something that isn't a confirmed fact yet (e.g. Nandana's specific languages, the reconstructed 12-day itinerary) — resolve these with Nandana before treating that content as final.
- DE/FR files carry `"_reviewStatus": "needs-native-review"` on translated objects — a native speaker should proofread these before launch.

## Google Calendar availability

The custom-tour wizard checks real-time availability via `/api/calendar/availability`, which calls `lib/calendar/googleCalendar.ts` using a Google OAuth2 refresh token (not a service account) tied to Nandana's own calendar. Required env vars (see `.env.example`):

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID
```

Only free/busy status is ever read — event titles, descriptions and attendees are never requested or exposed to the browser. Missing credentials or an API error both degrade to an "unknown" status rather than crashing.

## Deployment

Deploy to Vercel as a standard Next.js app (the calendar route needs serverless execution, so this is not a static export). Set the env vars above in the Vercel project settings — never as `NEXT_PUBLIC_*`.

Redirects from the old static site's URLs (`/single18.html` etc.) to the new locale-prefixed routes are already configured in `next.config.ts` via `lib/seo/redirects.ts`.

## What's out of scope for this build

- Real Google Calendar credentials (site works without them, degraded to WhatsApp contact).
- Final photography — images currently reused from the old site or generic placeholders; see `lib/content/imageMap.ts` for what to swap.
- Native-speaker review of German/French copy.
- Domain/DNS cutover from the live `naturewalksrilanka.com`.
- Analytics wiring.
