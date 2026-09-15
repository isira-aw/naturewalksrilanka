# Handoff — production cleanup, Firebase consolidation, launch polish

Branch: `claude/loving-dijkstra-r1ywj1` · six commits ahead of `main` (`c8ef996`)
· 87 files, +2798 / −2217.

> **This file is temporary.** A previous `handoff.md` was deleted in `2e25aa2`
> because it had grown into a 967-line log of a migration that had already
> merged, and every live fact in it was duplicated in `docs/`. Do not let this
> one go the same way. When the two open items under **Next steps** are closed,
> fold anything still true into `README.md` or `docs/` and delete this file.

---

## Goal

Take a finished UI to a launchable production site, in four passes:

1. **Cleanup** — one README plus a `docs/` folder, no dead code, no unused
   dependencies, no duplicated logic.
2. **One architecture** — Next.js → Firebase (Auth, Firestore, Storage) →
   Vercel. Exactly one authentication method, one database, one file store.
   No offline, mock, password or Blob fallbacks anywhere in the application.
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
| Files | Firebase Storage only |
| Deployment | Vercel only |

**Two things block calling this production-ready:**

1. The **itinerary migration has not run** and its status is unknown. See
   Next steps.
2. **No Firebase project has ever been connected.** Every Firebase code path
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

Load-bearing files to understand before changing anything:

| File | Why it matters |
|---|---|
| `lib/admin/auth.ts` | The **only** authorisation point. `requireAdmin` is async — a forgotten `await` returns a truthy Promise and admits everyone |
| `lib/firebase/admin.ts` | The only door to Firestore. Returns `null` rather than throwing when unconfigured |
| `lib/itineraries/firestoreStore.ts` | The only itinerary store. Route handlers call it directly |
| `firestore.rules` | Denies all client access on purpose — everything goes through route handlers |
| `storage.rules` | Real logic, not a formality: uploads genuinely go direct from the browser |
| `scripts/migrate-itineraries.mjs` | The only way to get data out of the old Blob archive. **Do not delete until the migration is confirmed** |
| `package.json` → `overrides` | Pins `jwks-rsa`'s `jose` to 5.x. Removing it takes the whole site down on Node 20 |

---

## Changes made

### Removed

- **Shared-password admin login** — `lib/admin/session.ts`, its in-process rate
  limiter `lib/admin/rateLimit.ts`, the `PasswordSignIn` form and the password
  branch in the session route. `ADMIN_EMAIL` / `ADMIN_PASSWORD` /
  `ADMIN_SESSION_SECRET` are gone. **Delete them from Vercel too** — nothing
  reads them, and a live secret nobody uses is a secret nobody rotates.
- **Vercel Blob as a data source** — `lib/itineraries/blobArchive.ts` and the
  `repository.ts` that chose between it and Firestore at runtime. Route
  handlers now call Firestore directly. `@vercel/blob` moved to
  `devDependencies`; only the migration script imports it.
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

---

## Next steps

### 1. The itinerary migration — the blocker

**Unknown and unverifiable from here.** This environment has no credentials, so
the dry run cannot be attempted:

```
$ node scripts/migrate-itineraries.mjs
Missing environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET, BLOB_READ_WRITE_TOKEN
```

The application no longer reads Vercel Blob. **If `itineraries/archive.json`
still holds live itineraries, deploying this branch serves an empty list to the
custom-tour wizard.** Before deploying:

```bash
# Dry run. Writes nothing, uploads nothing, deletes nothing.
node --env-file=.env scripts/migrate-itineraries.mjs

# Read the counts, then:
node --env-file=.env scripts/migrate-itineraries.mjs --commit
```

It is safe to re-run — records are written by id, and images already stored as
`https://` URLs are skipped. It never deletes the archive.

Once the admin list, the custom-tour page and the photographs all check out:
delete the `itineraries/archive.json` blob by hand, delete
`scripts/migrate-itineraries.mjs`, and drop the `@vercel/blob`
devDependency and `BLOB_READ_WRITE_TOKEN`. Vercel Blob is then gone entirely.

### 2. Connect Firebase

`docs/FIREBASE_SETUP_CHECKLIST.md`, in order. Note the bootstrap: there is no
password to sign in with any more, so the **first admin is granted from the
command line**, and `scripts/grant-admin.mjs` doubles as the credential test —
it uses the same service account and touches both Auth and Firestore.

### 3. Decisions outstanding

- **Analytics provider.** Requested, but not named. It changes the work:
  Plausible or Vercel Analytics are cookieless, so no consent banner is needed
  and UTMs become meaningful; GA4 sets cookies, so the banner becomes genuinely
  required.
- **Remaining vulnerabilities.** 1 high (`js-yaml`, build-time only) and 6
  moderate, all transitive through `firebase-admin`'s storage chain. The
  recommendation is to leave them: `firebase-admin` is what pins Node 22 and
  the `jose` override, both of which have taken the site down before. The fix
  currently carries more risk than the bugs.
- **Pull request.** None opened. The branch is pushed.

### 4. Content still required before launch

- **FAQ** — "what is included in the price" and "how and when do I pay" carry
  `contentRequired: true` in `content/<locale>/faq.json` and do not render.
  Only Nandana can answer them.
- **Privacy policy** — now materially wrong. It says the site runs no
  server-side database of visitor information; that was already untrue for
  enquiries and reviews, and is now also untrue for newsletter sign-ups. It is
  marked as pending legal review — update it before launch.
- **Search Console and Bing verification codes** — `docs/seo.md` has the
  step-by-step.
- **Native-speaker review** of the Dutch, Spanish, Danish and Finnish copy,
  including the new `search`, `faq` and `newsletter` strings.
