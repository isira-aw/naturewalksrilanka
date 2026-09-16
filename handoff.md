# Handoff — production cleanup, Firebase consolidation, launch polish

Branch: `claude/nifty-dirac-cx91uz` · one commit ahead of `main` · 23 files,
+4112 / −221, almost all of it content.

Rounds **#25 to #30** have merged. What follows describes the whole effort;
*This round* is what is new since #30, and *Earlier rounds* keeps what is
still worth knowing from the ones before it.

> **This file is temporary.** A previous `handoff.md` was deleted in `2e25aa2`
> because it had grown into a 967-line log of a migration that had already
> merged, and every live fact in it was duplicated in `docs/`. Do not let this
> one go the same way. When Firebase is connected and the items under **Known
> issues** are closed, fold anything still true into `README.md` or `docs/`
> and delete this file.

---

## Goal

Take a finished UI to a launchable production site, in four passes:

1. **Cleanup** — one README plus a `docs/` folder, no dead code, no unused
   dependencies, no duplicated logic.
2. **One architecture** — Next.js → Firebase (Auth, Firestore, Storage) →
   Vercel. Exactly one authentication method, one database, one file store.
   No offline, mock or password fallbacks anywhere in the application, and
   no third-party host in the request path for anything a page needs.
3. **Launch readiness** — SEO for `https://naturewalksrilanka.com/`, the
   critical Next.js security patch, and the UI polish a visitor notices.
4. **Never guess** — no invented prices, policies, verification codes or
   business facts. Unknowns get a marked placeholder, not a plausible-looking
   answer.

---

## Current state

**Green.** `tsc --noEmit`, `eslint` and `next build` all pass with zero
warnings. Verified in headless Chromium at 1280px and 390px: no JS exceptions,
no broken images, no missing `alt`, no horizontal overflow, no password inputs
anywhere on the site.

| | |
|---|---|
| Next.js | **16.3.5** (was 16.3.1 — two unauthenticated RCE advisories) |
| `npm audit` | 0 critical, 1 high, 6 moderate — all transitive, see Next steps |
| `jose` | 5.10.0, override intact and proven (see Failed attempts) |
| Admin auth | Firebase Google sign-in only. `admin` custom claim **and** a `staff` Firestore document, both required |
| Traveller auth | Firebase email-link only |
| Data | Firestore only |
| Files | **Cloudinary** only, since #27. Firebase Storage is gone; `storage.rules` with it |
| Deployment | Vercel only |
| Third-party hosts | Fonts are self-hosted by `next/font` and flags are local. Three services are reached at runtime: Cloudinary for every photograph, and OpenStreetMap tiles plus OSRM routing for the journey map — see *Known issues* §3 |

**One thing blocks calling this production-ready:**

1. **No Firebase project has ever been connected.** Every Firebase code path
   in this repository is still unproven against a real project. Since admin
   sign-in is now Firebase-only, the panel cannot be opened at all until the
   project exists — `docs/FIREBASE_SETUP_CHECKLIST.md` is the order to do it
   in.

A deployment with no Firebase variables still builds and serves every public
page; the Firebase-backed features report themselves unavailable.

---

## Active files

New in this work:

| File | What |
|---|---|
| `lib/seo/site.ts` | `SITE_URL`, in one place. Was spelled out in four files |
| `lib/seo/metadata.ts` | `buildPageMetadata` — canonical, hreflang, Open Graph, Twitter. Replaced nine near-identical `generateMetadata` bodies |
| `app/llms.txt/route.ts` | `/llms.txt`, generated from the content files |
| `app/not-found.tsx` | Root 404 — path not under a valid locale. No chrome, by design |
| `app/[locale]/not-found.tsx` | 404 inside a locale — bad tour or destination slug. Keeps header and footer |
| `app/[locale]/custom-tour/loading.tsx` | Loading skeleton. **Scoped to this route deliberately** — see Failed attempts |
| `app/api/search/route.ts` | Per-locale search index built from content files |
| `components/search/SiteSearch.tsx` | Search dialog: Cmd/Ctrl-K, arrows, Enter, Escape |
| `components/layout/ReadingAids.tsx` | Scroll progress bar and back-to-top |
| `components/faq/FaqAccordion.tsx` | Native `<details>` accordion, works with no JavaScript |
| `components/newsletter/NewsletterSignUp.tsx` | Sign-up form, four states, no optimistic success |
| `app/api/newsletter/route.ts` | Writes to Firestore keyed by email; honeypot |
| `content/<locale>/faq.json` | FAQ content, five locales |
| `docs/seo.md` | What is built, and the manual steps after deployment |
| `docs/photography.md` | Where each photograph lives and what happens when one is missing |
| `components/home/ActivityShowcase.tsx` | The "what you can discover" grid, from `activities.json` |
| `components/home/CustomJourneyInvite.tsx` | The custom-tour chapter of the home page; the strip is the wizard's own step labels |

Load-bearing files to understand before changing anything:

| File | Why it matters |
|---|---|
| `lib/admin/auth.ts` | The **only** authorisation point. `requireAdmin` is async — a forgotten `await` returns a truthy Promise and admits everyone |
| `lib/firebase/admin.ts` | The only door to Firestore. Returns `null` rather than throwing when unconfigured |
| `lib/itineraries/store.ts` | The only itinerary store (Firestore). Route handlers call it directly. The browser's fetch wrapper is `browserStore.ts` |
| `firestore.rules` | Denies all client access on purpose — everything goes through route handlers |
| `lib/cloudinary/media.ts` | Every photograph in and out. Admin uploads go direct from the browser under a signature; review photographs go through the server so the size and type limits are enforced somewhere the submitter does not control |
| `lib/reviews/store.ts` | Review links, redemption inside a transaction, moderation, and the deletes that take photographs with them |
| `package.json` → `overrides` | Pins `jwks-rsa`'s `jose` to 5.x. Removing it takes the whole site down on Node 20 |
| `content/<locale>/destinations.json` | All five locales now carry the full long-form. The English file owns the structure; the other four were translated from it and say so in `_note`. Change English and four files go stale |
| `app/[locale]/page.tsx` → `ACTIVITY_PLACE` | Which destination photograph stands for each activity. Slugs, so it holds in every locale; unmapped activities fall back rather than break |
| `content/<locale>/profile.json` → `languages` | Empty, and that is what hides the languages row and stat. Filling it in brings both back with no code change |

---

## Changes made

### Removed

- **Shared-password admin login** — `lib/admin/session.ts`, its in-process rate
  limiter `lib/admin/rateLimit.ts`, the `PasswordSignIn` form and the password
  branch in the session route. `ADMIN_EMAIL` / `ADMIN_PASSWORD` /
  `ADMIN_SESSION_SECRET` are gone. **Delete them from Vercel too** — nothing
  reads them, and a live secret nobody uses is a secret nobody rotates.
- **The second data source, entirely** — the archive module and the
  `repository.ts` that chose between it and Firestore at runtime, then its
  one-off migration CLI, its npm dependency and its access token. Confirmed
  by the owner to hold no data. Firestore is the only store; route handlers
  call it directly.
- **The base64 image fallback** — uploads that cannot reach Storage now throw a
  message the admin form shows, instead of silently reinflating the itinerary
  JSON every custom-tour visitor downloads.
- `handoff.md` (the old one), `lib/content/imageMap.ts` (exported, never
  imported, and named a file that did not exist), four unused Next.js starter
  SVGs, and three obsolete READMEs.

### Added or fixed

- **SEO** — per-page Open Graph and Twitter cards with page-specific content,
  `og:image` recut to 1200×630, `TouristAttraction` JSON-LD on destinations,
  `/llms.txt`, and a Bing verification placeholder beside the Google one. Both
  stay env-driven so no deployment claims a property it should not.
- **Error handling** — `/api/itineraries` is the one Firebase read behind a
  public page and had no `try/catch`; a Firestore outage was a 500 on the
  custom-tour wizard for every visitor. It now answers 503, which the client
  already degrades to an empty list.
- **Caching** — `Cache-Control` for `/images/*`, which Next serves with
  `max-age=0` by default. Deliberately not `immutable`: these are not
  content-hashed and are replaced by hand.
- **Next.js 16.3.5** and a print stylesheet, custom 404s, site search, an FAQ
  and a newsletter sign-up (see Active files).

### Deliberately not done

- **Dark mode** — declined.
- **Password visibility toggle, copy-to-clipboard on code snippets,
  last-updated on posts** — requested, but there are no password inputs (they
  were removed by request), no code snippets, and no blog. Building any of
  them means inventing the thing they attach to.
- **Cookie banner and UTM tracking** — both assume analytics that is not
  installed. The site sets only strictly-necessary session cookies, which are
  consent-exempt, so a banner would be theatre.
- **`FAQPage` JSON-LD** — Google restricted that rich result to government and
  health sites. Emitting it from a tour operator gains nothing and invites
  review.

---

## This round (branch `claude/nifty-dirac-cx91uz`)

A content, storytelling and conversion pass. No architectural change: no new
dependency, no new service, no change to the Firebase wiring, the custom-tour
business logic or the booking flow. Two presentational components are new and
five pages were re-ordered or re-worded; everything else is `content/`.

### The home page tells a story now, in a deliberate order

It used to open on logistics — "one company for the whole journey", then the
four things we arrange — before it had given anyone a reason to want Sri Lanka.
The order is now: what this island is → why this company → who guides you → the
journeys we run → where they happen → what you can actually do there → that you
can build your own → what we arrange around it → how to start the conversation.
Nothing was deleted. The fulfilment copy moved to where it reassures rather
than where it sells, and the section comment in `app/[locale]/page.tsx` states
the order so the next person does not undo it by accident.

### Two chapters that were missing

- **`components/home/ActivityShowcase.tsx`** — the six entries in
  `activities.json`, each with a photograph and a link into a destination that
  offers it. A visitor who came for birds or for a camera rather than for a
  duration now sees themselves on the page, and it is the densest patch of
  internal linking into the destination pages on the site. The photograph is
  chosen by `ACTIVITY_PLACE` in `app/[locale]/page.tsx`: slugs, not prose, so it
  holds in all five locales, and anything unmapped falls back to the first
  destination listing that activity.
- **`components/home/CustomJourneyInvite.tsx`** — the wizard is one of the real
  business opportunities and the home page previously reached it only through a
  secondary button. It now has its own full-bleed section, and the strip across
  it is the wizard's own step labels, so the four things being asked for are
  visible before anyone clicks in.

### Copy that was doing the wrong job

The tours index and the contact page were rendering their own meta descriptions
and CTA labels as visible headings; both now have copy written for the reader
while the SERP copy stays in `seo.json`. The destinations H1 was the single word
"Destinations". Tour pages give each activity its description rather than its
name alone, and answer "who is guiding me" from `profile.json` instead of
leaving it to the About page. A fourth trust reason — that these are private
journeys built around the traveller — joins `nandana.whyPoints`.

### Pricing and inclusions are answered, not hidden

The two FAQ items carrying `contentRequired: true` are answered in all five
locales, and the flag is gone, so `FaqAccordion` renders them. Neither answer
states a figure or a list, because neither exists: what a journey covers is
decided for the dates you travel — season, weather and whatever is happening
culturally that week — and the price is quoted by Nandana once he has seen the
journey. Both answers route the reader to him on WhatsApp, which is how the
business actually works.

`tour.included` and `tour.excluded` are still empty on every journey, so the
"What's included" section never rendered at all. Tour pages now carry a short
band saying why there is no fixed list, with a WhatsApp button. **The lists
still render the moment a journey is given them** — the band only appears when
both are empty, so nothing has to be undone later.

### Nandana's languages are no longer on the site

The `CONTENT_REQUIRED` stat is out of `content/<locale>/profile.json`, so the
About page no longer shows a dash where a number belongs, and the At-a-glance
row is rendered only when `profile.languages` is non-empty. **Filling that array
in is all it takes to bring both back** — no code change. `NandanaStory` sizes
its stat row to however many stats the profile carries rather than assuming
three.

### The multilingual gap, which was the largest thing here

Dutch, Spanish, Danish and Finnish destination pages carried only a one-line
`description` where English had the full write-up — `intro`, `sections`,
`wildlife`, `facts`, `goodToKnow` and gallery captions. Four fifths of the
audience were getting a fraction of the page. All four locales now carry the
whole thing, translated from the English draft and verified structurally
identical to it (15 destinations, 32 sections, 59 wildlife lines, 60 facts, 45
good-to-know lines, 15 captions, in every locale).

Bird and mammal names stay in their international English names, as the content
rules require. Dutch also mixed formal *u* into an otherwise informal site; that
is now consistent throughout.

**These translations are downstream of an unapproved draft.** The English
long-form is still `"_reviewStatus": "draft-written-for-review"`. If Nandana
revises it, the four translations need redoing — each locale file carries a
`_note` saying so.

### One factual correction

Kithulgala's gallery photograph is captioned "Rafting the Kelani River" and
shows a river with no raft in it. Re-captioned in all five locales. It is also
why `ACTIVITY_PLACE` marks that one `gallery: true`: the destination's card
photograph is an owl, which is not what "Adventure Sports" means.

### Verified

`next build` and `eslint` clean. All 130 locale routes return 200 (11 pages plus
15 destinations, times five locales), plus `/sitemap.xml`, `/robots.txt` and
`/llms.txt`. Translation-key parity checked across `ui`, `seo`, `navigation`,
`faq`, `activities` and `profile` in all five locales, with no English string
left sitting in a non-English file. Canonical, hreflang and JSON-LD unchanged
and still emitting. New sections screenshotted in headless Chromium at 1440px
and 390px.

---

## Earlier round — merged as #30 (branch `claude/clever-volta-i7bo35`)

One commit on top of #29, and the two rounds before it (#28, #29) are
described here too because they landed in the same sitting and the pieces
refer to each other.

### The take-away documents carry a real map (#28)

The PDF and the Word file used to embed a hand-drawn outline of the island
with numbered dots on it. It looked nothing like the map the traveller had
just been reading in the wizard, and a coastline with six dots tells nobody
where they are going.

- `lib/journey-document/mapImage.ts` — fetches the OpenStreetMap tiles for the
  route's own bounding box, draws the route and stops over them, and hands one
  canvas to both renderers. Tiles come through `fetch` rather than an `<img>`
  so the canvas is never tainted and can be read back out.
- `lib/journey/roadRoute.ts` — asks OSRM for the real driving geometry, cached
  by waypoint signature so the on-screen map and both documents share one
  request. The line is dashed until the router answers and solid after.
- `lib/journey-document/mapCanvas.ts` is now the **fallback**, not the
  default: no tiles, no network, still a map. Both services degrade to it
  silently, which is the whole reason they are allowed in the request path at
  all.
- The map is rendered once in `lib/journey-document/index.ts` and passed to
  `pdf.ts` and `word.ts`, so the two files can never show different routes.

`components/ui/Lightbox.tsx` arrived in the same commit: any grid of
photographs can hand its pictures to it and get a full-screen viewer with
arrow keys, swipe and a caption. The itinerary dialog uses it; so do the
testimonials. Its strings live in the shared `gallery` namespace in
`content/<locale>/ui.json`.

The download buttons left the journey-plan step. The PDF is offered once, at
the end, on the review step.

### Reviews stopped depending on enquiries (#29, and this commit)

A review link no longer comes from a custom-tour enquiry. The team meets
travellers who never filled the form in — an agent's group, a repeat guest —
and their reviews are worth as much as anyone's.

- The admin panel's **Review links** section makes a link from nothing: a
  label for the team's own reference and the language the form should open
  in. Nothing is emailed and no address is matched. The token is the
  credential, as it always was; single-use, 60 days.
- **Published** lists what is live, with *Unpublish* (back to the queue,
  photographs intact) and *Delete* (gone for good, photographs destroyed,
  asks first). *Delete* is on the pending list too.
- Approved reviews now carry the traveller's own photographs onto the public
  page. They always existed and moderation always showed them;
  `publishedTestimonials` was dropping them on the way out.

**This commit removed the enquiry queue from the admin side entirely** — the
`Enquiries` section, `/api/admin/requests`, `listRequests`,
`invitesForReference` and its Firestore index, and the branch of the invite
endpoint that built a link out of an enquiry.

Enquiries themselves are untouched: the wizard still writes a `tourRequests`
document, `/my-trip/<reference>` still reads and amends it, and the WhatsApp
hand-off still works. Only the admin list of them is gone. Links made while
invitations came from enquiries still carry a reference, and the panel still
shows it, so an old one can be placed. Note what this means for *Known
issues* §2: that endpoint is still unauthenticated and unbounded, and nothing
in the admin panel looks at what it writes any more.

### The testimonials are a rotating rail

`components/home/VoicesSlider.tsx` was one full-width quote at a time and took
most of a screen. It is now a rail of cards — one on a phone, two from tablet
up — advancing by itself every three seconds and wrapping from the last back
to the first. The same section now also sits on the About Nandana page.

The rail is the list rendered **twice**. Moving past the last card lands on
the copy of the first, and the moment that transition finishes the position
jumps back to the real one with the animation switched off. That is what makes
the wrap invisible instead of a rewind across the screen; it is also why the
track must be exactly as wide as the viewport (a negative margin on it shows
the neighbouring cards through at the edges — that bug was built and fixed
here).

It pauses on hover, on focus and while a photograph is open, and never
auto-starts for a visitor who has asked for reduced motion. Cards off screen
are `inert`, so the duplicates are not in the tab order.

---

## Earlier round — merged as #26

Four commits on top of #25. Every architectural decision was re-checked
against the code before anything was changed, and each row held: admin auth
(Google sign-in, `admin` claim **and** `staff` document), traveller auth
(email link only), Firestore-per-itinerary, Storage URLs, deny-all client
rules, one `SITE_URL`, one `buildPageMetadata`, client-side search over a
fetched index, native `<details>` FAQ, email-as-document-id newsletter, and
the two 404s. No competing implementation survived anywhere.

### Removed

- `lib/motion.ts` — a second set of framer-motion variants nothing imported.
  `components/ui/motion.tsx` is the vocabulary the site actually uses. This
  was the last genuine duplicate implementation in the repository.
- `components/custom-tour/CustomTourTeaser.tsx` — unreferenced component.
- `getRecord`, `isItineraryCategory`, `isProvince`, `JOURNEY_START` and
  `itineraryStore.get` — exported, never called.
- **Vercel Blob, entirely.** The owner confirmed the archive held no data, so
  the migration CLI, the npm dependency and its access token are gone. This
  closes what was previously the branch's headline blocker.
- **flagcdn.com**, the only third-party host in any page's request path.

### Renamed

`lib/reviews/` and `lib/tourRequests/` both use `store.ts` for the
server-side Firestore access; `lib/itineraries/` had that in
`firestoreStore.ts` and used `store.ts` for the browser's fetch wrapper,
which inverted the convention. Now:

    firestoreStore.ts -> store.ts        (server, Firestore)
    store.ts          -> browserStore.ts (browser, wraps the routes)

### Added

- `public/images/flags/` — the five language-switcher flags, vendored from
  the MIT-licensed flag-icons package and served from this origin. No npm
  dependency was added; `LICENSE.txt` sits beside them as MIT requires.
- `app/icon.svg` and a regenerated `app/favicon.ico`. The favicon was still
  the create-next-app default.

---

## Photographs moved to Cloudinary — merged as #27

`docs/cloudinary.md` carries the reasoning and the acceptance checklist.
Cloudinary replaced **Firebase Storage and only Firebase Storage**: accounts
are still Firebase Auth and every document is still Firestore. `storage.rules`
is gone, and `firebase.json` now declares Firestore alone.

No Cloudinary account has been connected either, so those paths are unproven
against a real one in the same way every Firebase path is.

---

## Known issues

Found by review, **still not fixed**, roughly in priority order. None of them
is new this round; all of them outlive it.

### 1. The privacy policy contradicts the code

`app/[locale]/privacy/page.tsx` says the site "does not run a server-side
database of visitor or customer information" and that enquiry details are
"not stored on, or transmitted through, a server or database operated by
this website". Both are false: `WizardShell.handleSent()` POSTs to
`/api/custom-tour/requests`, which writes name, email, phone, country and
requirements to Firestore. Newsletter sign-ups and reviews store personal
data too.

The "placeholder pending legal review" banner does not cure an affirmative
false statement, and the site is sold into four EU markets. Correcting it
needs business facts nobody here can invent — retention, legal basis,
controller, data-subject rights — so it needs Nandana and, ideally, a
lawyer. The factual half (what the code stores) is written down above.

### 2. The enquiry endpoint is unauthenticated and unbounded — and now unwatched

`POST /api/custom-tour/requests` has no auth, no rate limit and no honeypot,
and `requestPayloadSchema` puts no `.max()` on `name`, `requirements` or
`accommodationNotes`. One request can push roughly a megabyte into
Firestore, and nothing stops a loop. The newsletter route already has the
honeypot pattern to copy. This is the cheapest real fix on the list.

Since the admin enquiry queue was removed, nothing in the panel reads what
this endpoint writes either — junk would accumulate in `tourRequests`
unnoticed, and only `/my-trip/<reference>` would ever look at it.

### 3. Smaller items

- **No Content-Security-Policy.** HSTS, `nosniff` and `Referrer-Policy` are
  set in `next.config.ts`; CSP is not.
- **`app/sitemap.ts` sends `lastModified: new Date()`** for every URL on
  every request, so the signal is always "just changed" and search engines
  discount it. The content files carry no timestamps, so the honest fix is
  to omit the field.
- **Three third-party runtime services, all of them easy to miss.**
  Cloudinary serves every photograph on the site. `tile.openstreetmap.org`
  serves the wizard's map (`components/custom-tour/steps/journey-plan/RouteMap.tsx`)
  *and*, since #28, the map embedded in the PDF and the Word file
  (`lib/journey-document/mapImage.ts`). `router.project-osrm.org` supplies the
  driving geometry for both. The two map services are free, best-effort and
  rate-limited by policy rather than by contract; both degrade to a straight
  line on a drawn island rather than failing, but a busy site should move to a
  keyed tile provider. None of the three is exercised by `next build`, and the
  map ones only render deep inside the wizard.
- **`lib/ai/translateItinerary.ts` pins `gemini-3.6-flash`.** Worth
  confirming that id is current; it has never run against a real key.

---

## Failed attempts

Four things that went wrong. Three were caught; all four are worth knowing.

### 1. `loading.tsx` at the locale root turned every 404 into a soft 404

A `loading.tsx` wraps everything below it in a Suspense boundary. Once that
boundary starts streaming the HTTP status has already been sent, so a
`notFound()` thrown by a page underneath can no longer set 404.

`app/[locale]/loading.tsx` therefore made every mistyped tour and destination
slug return **200** with the generic site title, streaming the not-found UI in
afterwards. Search engines read that as a duplicate of the home page — it
silently undid the 404 work and the SEO work before it.

**`tsc`, `eslint` and `next build` were all clean the whole time.** It was
caught only by checking status codes in a browser. The skeleton now lives at
`app/[locale]/custom-tour/`, which has no slug to get wrong.

**Rule:** never put `loading.tsx` above a page that can call `notFound()`.

### 2. `npm` silently strips the `jose` override from the lockfile

Both `npm uninstall` and `npm install next@…` removed the `overrides` block
from the **lockfile's** root entry, while leaving it in `package.json`.
Resolution stayed correct at the time, so nothing appeared broken — but a
later install could resolve `jose` 6, which is ESM-only, and `jwks-rsa` does
`require('jose')`. That is the exact fault that returned 500 on *every* page
of the deployed site under Node 20.

Restored by hand both times, never by regenerating the lockfile — a full
regeneration once bumped 83 unrelated packages. Verified after a clean
`npm ci`: `jwks-rsa@4.1.0` declares `jose ^6.1.3`, resolves to `5.10.0`, and
`require('jose')` succeeds from CommonJS.

**Rule:** after any `npm install` or `npm uninstall`, check that
`packages[""].overrides` is still in `package-lock.json`.

### 3. The search dialog was mounted twice

`SiteSearch` was placed in both the desktop and the mobile header groups. Only
one button is ever visible, so clicking looked fine — but each instance
registered its own global Cmd/Ctrl-K listener and rendered its own portal, so
the keyboard shortcut opened **two stacked `aria-modal` dialogs**. Now mounted
once, in the flex row, visible at every breakpoint.

### 4. A test reported the custom-tour wizard as broken when it was not

An early Playwright script used `.last()` to find the Continue button and hit
the hidden mobile sticky bar, so clicks did nothing and the wizard looked
stuck. It was the selector, not the wizard. Worth remembering when this site's
duplicated responsive controls are under test: **filter by visibility first.**

### 5. An XML comment may not contain two consecutive hyphens

Documenting `app/icon.svg` with a reference to a CSS custom property put a
literal double hyphen inside an SVG `<!-- -->` block, which is illegal XML.
An SVG served as `image/svg+xml` is parsed strictly, so the browser would
have refused to render the icon at all. `tsc`, `eslint` and `next build` were
all perfectly happy; it was caught by parsing the file.

**Rule:** after editing any `.svg`, parse it. One line does it:
`python3 -c "import xml.dom.minidom;xml.dom.minidom.parse('app/icon.svg')"`.

### 6. `pkill -f "next start"` does not stop the server

The process is called `next-server`, so that pattern matches the npm wrapper
and leaves the server running. A stale one then keeps answering on port 3000
from an **old build** — which looked exactly like a new route 404ing. Worse,
`pgrep -f next-server` matches the shell command that contains that string,
so it reports a phantom process and `pkill -9 -f` kills the shell.

**Rule:** find it by what is listening, or read `/proc/*/cmdline` and skip
your own PID. Confirm with a request before trusting a verification run.

### 7. `grep -- "$pattern" . --exclude-dir=…` silently searches everything

`--` ends option parsing, so every `--exclude-dir` after it became a filename
instead of an exclusion. The result was a confident report of Vercel Blob
references that were really matches inside `node_modules` and `.next`.

**Rule:** for "is it gone", use `git grep`, which only sees tracked files.

---

## Next steps

### 1. Connect Firebase

`docs/FIREBASE_SETUP_CHECKLIST.md`, in order. Note the bootstrap: there is no
password to sign in with any more, so the **first admin is granted from the
command line**, and `scripts/grant-admin.mjs` doubles as the credential test —
it uses the same service account and touches both Auth and Firestore.

### 2. Decisions outstanding

- **Analytics provider.** Requested, but not named. It changes the work:
  Plausible or Vercel Analytics are cookieless, so no consent banner is needed
  and UTMs become meaningful; GA4 sets cookies, so the banner becomes genuinely
  required.
- **Remaining vulnerabilities.** 1 high (`js-yaml`, build-time only) and 6
  moderate, all transitive through `firebase-admin`'s storage chain. The
  recommendation is to leave them: `firebase-admin` is what pins Node 22 and
  the `jose` override, both of which have taken the site down before. The fix
  currently carries more risk than the bugs.
- **Analytics still governs the cookie-banner question**, and the privacy
  policy has to be corrected either way — see *Known issues* §1.

### 3. Fixes identified but not made

The items under *Known issues* above. §2 (bounding and rate-limiting the
enquiry endpoint) is small, self-contained and the obvious next commit, and
it matters more now that nothing in the admin panel watches that collection;
§1 needs business facts from Nandana before a line of it can be written.

### 4. Content still required before launch

- **Nandana's approval of the destination long-form.** `content/en/destinations.json`
  is drafted copy, not confirmed fact, and four locales are now translated from
  it. This is the one that should be read before launch; a revision costs five
  files, not one.
- **Privacy policy** — materially wrong, and the most serious thing on this
  list. See *Known issues* §1 for exactly which sentences are false and what
  the code actually stores. Only Nandana, with legal advice, can supply the
  rest.
- **Search Console and Bing verification codes** — `docs/seo.md` has the
  step-by-step.
- **Native-speaker review** of the Dutch, Spanish, Danish and Finnish copy. This
  got substantially larger this round: the destination long-form in those four
  locales is new, and so are the FAQ answers on pricing and inclusions. The
  `search`, `newsletter` and `gallery` strings are still the least reviewed of
  the older ones.
