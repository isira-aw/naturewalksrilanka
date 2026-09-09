# Handoff — admin-authored itineraries, 5 categories, journey plan documents

> Replaces an earlier, unrelated handoff at this path (country-flag language
> switcher + destination image wiring). That work is merged and is not
> described here. Delete this file before merge if the team does not keep
> handoff notes in-tree.

## Goal

Rework `/custom-tour` end to end:

1. Cut the interest categories from seven to the five the operator actually
   sells: birding and wildlife, wildlife and photography, culture tours,
   adventure tours, others.
2. Delete the checked-in mock itineraries.
3. Add a password-gated admin page — sidebar, first section "custom tour
   optimisation" — that lists itineraries and can add, edit, hide and delete
   them. The add form takes category, province, head, two or three base64
   photographs, best time of year, suggested length, content 1 and 2, and
   "what you might see" entries (name, optional description, optional image).
   English only; the other four locales come from Gemini afterwards, with a
   retry for when Gemini is unavailable.
4. Because there is no backend or database, make the data trivially migratable
   later without loss.
5. Reformat "what you might see" in the itinerary dialog to `★ Name
   [description]`, listed one by one, photographs after.
6. Replace the "AI Travel Assistant" step: instead of a model inventing a
   route, take the itineraries the traveller chose, order them location to
   location, draw them on a Sri Lanka map, and produce a full report as PDF
   *and* as an editable Word file — with "what you might see" photographs as
   page backgrounds, and a closing note that the document is AI-generated and
   that the team will help with changes on WhatsApp.

## Current state

All six done, committed as `998c617` on
`claude/custom-tour-admin-itineraries-uuex35`, pushed, and opened as
[PR #9](https://github.com/isira-aw/naturewalksrilanka/pull/9).

`tsc --noEmit`, `eslint` and `next build` are all clean (one pre-existing
`no-img-element` warning in `LocaleSwitcher.tsx`, untouched by this work).

Driven in a real browser against `next dev`, not just typechecked: sign-in,
add/edit/hide/delete, wrong password → 401, unauthenticated translate → 401,
the failed-translation path and its retry (including that the outcome is
written back to the store), admin itineraries appearing in the wizard, the
route re-ordering a south-then-centre selection into centre-then-south, and
both documents downloading with the map and the notice present. The PDF was
rendered page by page and read.

**Never exercised against the real Gemini API** — there is no
`GOOGLE_AI_API_KEY` in this environment, so only the failure path has run.
See Next steps.

## Active files

### New

| File | Role |
| --- | --- |
| `lib/itineraries/categories.ts` | The five categories, defined once. Admin form, wizard step and content schema all read this. |
| `lib/itineraries/types.ts` | The admin record + zod schemas, the archive envelope, `SCHEMA_VERSION`, slug helpers. |
| `lib/itineraries/store.ts` | `ItineraryStore` interface + the localStorage implementation, export/import, `migrate()`. **The seam a backend plugs into.** |
| `lib/itineraries/toExperience.ts` | Record → the wizard's `Experience`, applying a translation when ready and falling back to English when not. |
| `lib/itineraries/useItineraries.ts` | Store contents, kept in step across tabs. |
| `lib/itineraries/imageFile.ts` | File → resized base64 data URL; byte-size helpers for the quota warning. |
| `lib/admin/session.ts` | Credential check + signed cookie. **Server-only; the only place either credential exists.** |
| `app/api/admin/session/route.ts` | GET status / POST sign in / DELETE sign out. |
| `app/api/admin/translate/route.ts` | One itinerary, one locale, per request. 503 when Gemini is down. |
| `lib/ai/translateItinerary.ts` | The Gemini call. Never throws — returns a reason. |
| `app/[locale]/admin/page.tsx` | Route shell; `robots: noindex`. |
| `components/admin/AdminApp.tsx` | Sidebar + panel switching + the sign-in gate. |
| `components/admin/AdminSignIn.tsx`, `ItineraryList.tsx`, `ItineraryForm.tsx`, `TranslationsPanel.tsx`, `DataPanel.tsx`, `controls.tsx` | The admin screens. |
| `lib/geo/sriLanka.ts` | Provinces + centroids, named places, road estimate, nearest-neighbour ordering, simplified coastline. Client-safe. |
| `lib/journey/plan.ts` | Selected itineraries → ordered stops with day ranges and drives. |
| `components/custom-tour/steps/JourneyPlanStep.tsx` | The step that replaced the AI assistant. |
| `components/custom-tour/steps/journey-plan/RouteMap.tsx` | On-screen leaflet map, numbered pins. |
| `components/custom-tour/useJourneyDocument.ts` | Builds the document once; plan step, review step and the WhatsApp Word copy all use it. |
| `lib/journey-document/fromWizard.ts` | Pure assembly of `JourneyDocument`, incl. choosing each section's background photograph. |
| `lib/journey-document/mapCanvas.ts` | Draws the route map for the documents. |
| `components/ui/Photo.tsx` | `next/image` for files under `public/`, plain `img` for data URLs. |
| `docs/itinerary-storage.md` | Where the data lives and the exact steps to move it to a backend. |

### Modified

| File | Change |
| --- | --- |
| `lib/content/schema.ts` | `category` now reads `ITINERARY_CATEGORY_IDS`; added optional `province`. |
| `content/*/ui.json` (×5) | New `interests` keys, `steps.aiAssistant` → `steps.journeyPlan`, whole `journeyPlan` block, `downloadDoc`, new `document.*` keys. |
| `content/*/experiences.json` (×5) | Emptied to `[]`. |
| `components/custom-tour/WizardShell.tsx` | AI state removed; merges published + admin itineraries; owns the plan and the document. |
| `components/custom-tour/steps/InterestsStep.tsx` | Reads `ITINERARY_CATEGORIES` instead of a hardcoded list. |
| `components/custom-tour/steps/ReviewStep.tsx` | Now presentation only — receives the plan and the download callback. |
| `components/custom-tour/ExperienceDialog.tsx` | `★ Name [description]` list, then photographs; uses `Photo`. |
| `lib/journey-document/model.ts`, `pdf.ts`, `word.ts` | Route section, drawn map, closing notice, highlight-photo backgrounds. |
| `scripts/build-translations.mjs`, `content/_translations/README.md` | Experiences overlay pipeline removed (itineraries are admin-owned now). |
| `app/robots.ts` | Disallows `/admin` and `/*/admin`. |
| `app/[locale]/custom-tour/page.tsx` | Dropped the `aiAssistantEnabled` prop. |

### Deleted

`components/custom-tour/steps/AIAssistantStep.tsx`, `steps/ai-assistant/`,
`app/api/ai-assistant/`, `lib/ai/{config,geminiClient,itinerarySchema,rateLimiter,sriLankaLocations}.ts`,
`content/_translations/experiences.*.json`. All of it became unreachable once
the assistant step went; the cluster was self-referential dead code.

## Changes made

**Categories** are defined once and imported everywhere, because the previous
arrangement had the same list hardcoded in three places and they had already
drifted — that is exactly the bug that bit during testing (see below).

**Admin auth** posts to an API route rather than comparing in the browser.
This was a deliberate choice over the simpler client-side check: the brief said
only admins should know the credentials, and a client-side comparison ships the
password in the JS bundle to every visitor.

**Storage** went through an interface from the start rather than calling
`localStorage` directly. The record shape is written as if a database were
already behind it — stable `id` never derived from the title, timestamps,
versioned envelope, translations as sub-records rather than parallel files — so
the migration is an adapter swap plus one import, not a re-modelling.

**Editing an itinerary's English resets its translations** to missing. A
translation of superseded text is worse than no translation, since the fallback
would otherwise quietly serve the old wording in four languages.

**Route ordering** is nearest-neighbour from the airport. Not optimal, but
stable — the same selection always yields the same plan — and on an island this
size it produces the loop a guide would really drive. A traveller picks
itineraries because each appeals, not in visiting order, so left unsorted a
plan can cross the island four times.

**The documents' map is drawn, not screenshotted.** Leaflet's tiles are
cross-origin, so the canvas would be tainted and unreadable; and a saved
document should not need a tile server to be up when someone opens it. The
coastline lives in `lib/geo/sriLanka.ts` as ~36 points.

**Section backgrounds prefer a "what you might see" photograph** over the
itinerary's own, per the brief, falling back when there is none.

## Failed attempts

- **`InterestsStep` kept the old seven category keys.** Updating `ui.json` and
  the schema was not enough — the component had its own hardcoded
  `INTEREST_KEYS`. Typecheck did not catch it (they are plain strings) and the
  build passed. It only showed up when a browser rendered the raw message keys
  `customTour.interests.wildlife` as chip labels. This is why the list now
  lives in one module. **Grep for hardcoded copies before assuming a list is
  centralised.**
- **The admin panel nested a second `<main>`** inside the layout's
  `<main id="main-content">`. Found because a Playwright selector hit a strict
  mode violation, not because anything failed to render. Now a labelled
  `<section>`.
- **Playwright's bundled-browser version did not match the image's.** The npm
  package wanted build 1243; `/opt/pw-browsers` has 1194. Launching needs
  `executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"` —
  do **not** run `npx playwright install`.
- **`[role="dialog"]` is ambiguous under `next dev`.** The Next error overlay
  is also `role="dialog"`, so the selector resolved to two elements. Target
  `[aria-labelledby="experience-dialog-title"]` instead.
- **A "did the failure persist across reload?" check looked like a bug and was
  not.** `page.addInitScript` re-seeds `localStorage` on *every* navigation, so
  the reload wiped the recorded translation state. Read `localStorage` directly
  after the action instead of reloading.
- **`daysBetween` does not exist** in `lib/tour/dateRange.ts`; the helper is
  `countDays`. Written from memory, caught by the typechecker.
- **`pdftoppm` is not installed.** The PDF was inspected by opening it in
  headless Chromium's viewer and screenshotting pages.

## Next steps

1. **Set `ADMIN_PASSWORD` (and `ADMIN_EMAIL`, `ADMIN_SESSION_SECRET`) in
   Vercel before this is public.** The default password is in the repository
   because the brief specified it as the default — which means everyone with
   repo access knows it. This is the one item that should not wait.
2. **Exercise the Gemini translation against the real API.** Only the failure
   path has ever run. Set `GOOGLE_AI_API_KEY`, add an itinerary, press
   Convert, and check the four locales come back with the highlight count
   intact (the route rejects a mismatch — see
   `lib/ai/translateItinerary.ts`). Also confirm `gemini-3.6-flash` is still
   the right model id; it was inherited from the deleted assistant code.
3. **Decide the backend.** Until then, itineraries are per-browser: not
   visible to travellers, not shared between staff machines, and lost if site
   data is cleared. `docs/itinerary-storage.md` has the steps. Whoever authors
   the first real itineraries should export immediately afterwards.
4. **Look at the leaflet map with real tiles.** The sandbox proxy blocked
   `tile.openstreetmap.org`, so the on-screen basemap was only ever seen empty
   — the pins and the route polyline render correctly, but the tiles are
   unverified. The *printed* map is drawn locally and was verified.
5. **Check a phone width.** Everything was driven at 1400px. The layouts use
   the same responsive idiom as the rest of the wizard, but no narrow viewport
   was opened.
6. **The coastline is hand-traced and simplified** (~36 points). It reads as
   Sri Lanka at document size; if it is ever printed larger, replace
   `SRI_LANKA_OUTLINE` with a real simplified GeoJSON ring.
7. **No automated tests were committed.** The Playwright scripts that verified
   all of the above were scratch files outside the repo. If this area is going
   to keep changing, the admin round-trip and the route ordering are the two
   worth keeping.
8. **`content/*/experiences.json` are now empty arrays.** They are still
   loaded, validated and merged ahead of admin records, so an itinerary can
   still be committed to the repo if the team ever wants one version-
   controlled. Nothing needs doing unless that is wanted.
