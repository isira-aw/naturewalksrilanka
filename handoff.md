# Handoff — Firebase migration: foundation, admin auth, itineraries

> Replaces an earlier handoff at this path describing the admin-authored
> itineraries work (merged as PR #9). That work is done and is not described
> here. Delete this file if the team stops keeping handoff notes in-tree.

## Goal

Move everything dynamic onto Firebase — traveller flow, itinerary
management, a customer review section — while securing the admin panel and
making images load faster. Six phases; five are written and merged, phase 6
(images) is written and needs no Firebase, and **every part of the other five
that touches Firebase has never run against a real Firebase project**, because
none exists yet.

**If you read nothing else:** the next step is not more code. It is creating
the Firebase project and proving what is already on `main` actually works.
See "The important caveat" and "Next steps".

**The instructions for doing that now live in
[`docs/FIREBASE_INTEGRATION.md`](docs/FIREBASE_INTEGRATION.md)**, with the
steps as a tick-list in
[`docs/FIREBASE_SETUP_CHECKLIST.md`](docs/FIREBASE_SETUP_CHECKLIST.md). Those
two are the practical guide — every variable name, every console setting, the
verification order and the troubleshooting. This file stays the record of
*why* each decision was made and what is still unproven. **Nothing in them has
been executed yet:** creating a Firebase project needs a Google account and
console access, which no automated session has. Everything below about the
Firebase code being unproven is still true.

### Decisions taken with the operator

- **Firebase, not Supabase.** Supabase was recommended first (relational fit,
  Postgres, the table editor doubling as a free admin dashboard); the operator
  chose Firebase. Settled — build on it rather than reopening it.
- **Firebase for new dynamic data only.** The static per-locale JSON under
  `content/`, next-intl, and the Gemini translation route stay exactly as they
  are. Moving translated content into Firestore was explicitly rejected: file
  based content is faster, versioned in git, and free.
- **Admin auth:** Firebase Auth with allowlisted staff emails and an `admin`
  custom claim.
- **Reviews:** staff-moderated, tied to a real tour request, star rating plus
  text plus photos, and reached through a shareable invite link that staff
  generate from the admin panel.
- **Same-device draft recovery is enough.** Cross-device resume was considered
  and not wanted, which is why phase 4a needs no backend at all.

## Full plan

Phases 0 through 5 are **written and merged**; phase 6 is written and
verified. Everything touching Firebase is written but unproven — see
"Current state".

### Phase 0 — Security hotfix (DONE)

`lib/admin/session.ts` shipped with `ADMIN_PASSWORD` defaulting to `"000000"`
and `ADMIN_SESSION_SECRET` defaulting to a string committed in the repository,
and neither was set in `.env`. The session token's only payload is a
timestamp, so anyone holding that public fallback secret could mint a valid
`nwsl_admin` cookie **without ever knowing the password**. Fixed here.

### Phase 1 — Firebase foundation (DONE, but unproven)

The code is written; **nothing has ever talked to a real Firebase project.**
See "Current state" for what that means.

`firebase` and `firebase-admin` installed. `lib/firebase/admin.ts` is a
`server-only` singleton guarded on `getApps()`, because Next.js re-evaluates
modules on hot reload and initialising twice under one name throws.
`lib/firebase/client.ts` covers sign-in and direct-to-Storage uploads only.
`lib/firebase/collections.ts` names every collection once, so a typo is a
compile error rather than a silently-created second collection.

**Architectural rule: every Firestore read and write goes through a server
route handler using the Admin SDK; the client SDK never touches Firestore.**
`firestore.rules` therefore denies all client access outright. That is a
deliberate trade — per-collection rules are easy to write and easy to get
subtly wrong, and one over-broad `allow read` on `tourRequests` would expose
every traveller's name, email and phone number. `storage.rules` does carry
real logic, because uploads genuinely do go direct from the browser.

Neither module throws at import time. The site has to keep building and
serving while the migration is part-done, so an unconfigured environment
yields `null` and callers report the feature unavailable.

Collections: `itineraries`, `tourRequests`, `reviewInvites`, `reviews`, `staff`.

### Phase 2 — Admin auth on Firebase Auth (DONE, Firebase half unproven)

`lib/admin/auth.ts` is now the single authorisation point. `AdminSignIn.tsx`
signs in with Google, gets an ID token and POSTs it; the session route
verifies it, requires **both** the `staff` allowlist entry and an
`admin: true` custom claim, and mints a Firebase session cookie (httpOnly,
secure, `sameSite: "strict"`).

**The legacy shared password still exists, but only while Firebase is
unconfigured.** This phase replaces the only working way into the panel, and
if the Firebase credentials turn out to be wrong there would otherwise be no
way in to fix them. Once a real staff account can sign in, delete the
fallback: the legacy branch in the session route, `PasswordSignIn` in
`AdminSignIn.tsx`, `lib/admin/session.ts`, `lib/admin/rateLimit.ts`, and the
three `ADMIN_*` variables. Leaving a shared password alive indefinitely
defeats the purpose. Note the ordering in `requireAdmin`: when Firebase *is*
configured the legacy cookie is no longer accepted, so this is a fallback for
a broken deployment, not a permanent second door.

**`requireAdmin` is now async.** Every call site must `await` it. A forgotten
`await` returns a Promise, which is truthy, which admits everyone — this is
the one genuinely dangerous mistake available in this code. The verification
below includes the test that catches it.

**No middleware was added, contrary to the plan.** `proxy.ts` runs on the
edge runtime, where `firebase-admin` cannot run, so a middleware check could
only test whether a cookie *exists* — which proves nothing. Instead the admin
page is a `force-dynamic` server component calling `isAdminSession()`, which
does full verification in the Node runtime and never sends the panel's markup
to a stranger. That is strictly stronger than the planned middleware.

The `admin` claim is set by `scripts/grant-admin.mjs`, never over HTTP.

### Phase 3 — Itineraries to Firestore + Storage (DONE, Firestore half unproven)

`lib/itineraries/repository.ts` is the new server-side facade: Firestore when
configured, the old blob archive when not — the same fallback shape as the
sign-in, for the same reason. Route handlers call the facade and no longer
touch storage directly.

On Firestore each itinerary is **one document**, which removes a real bug:
`blobArchive.ts` does a whole-file read-modify-write with no locking, so two
admins saving at once silently overwrite each other. On the blob path that
race still exists, because a single JSON file cannot do better.

The `ItineraryRecord` shape is unchanged, so `toExperience.ts`, the wizard and
most of the admin form did not have to change. A malformed document is logged
and skipped rather than failing the whole list — returning fewer itineraries
is bad, returning none is worse. A `replace` import runs as one atomic batch,
and refuses outright above 500 operations rather than applying in halves.

**Images now upload to Storage** (`lib/itineraries/imageUpload.ts`), falling
back to inline base64 when there is no signed-in Firebase user, because
`storage.rules` requires the `admin` claim and the legacy password path does
not produce one. `next.config.ts` gained the `remotePatterns` entries this
needs — without them `next/image` silently refuses the new URLs.

The 30-second poll in `store.ts#subscribe` is gone, replaced by a refetch on
tab focus. It was re-downloading the whole archive on a timer for every open
tab, including every visitor sitting on the custom-tour page.

`scripts/migrate-itineraries.mjs` moves the existing data. It is a **dry run
by default** and never deletes the blob archive.

Deliberately **not** done from the original plan: caching the public read with
`revalidateTag` instead of `force-dynamic`. The response now varies by admin
cookie, and a caching mistake there would serve one visitor's view to
another. Worth doing, but as its own change with its own testing.

### Phase 4 — Traveller flow (both DONE)

**4a — draft autosave.** No backend. Done; see below.

**4b — persisted submissions (DONE, Firestore half unproven).**
`POST /api/custom-tour/requests` writes a `tourRequests` document keyed by a
short human `reference` (`NW-7K3QD`). The wizard's answers are stored as one
opaque `payload` map rather than columns: the wizard changes often — a step
was added and an AI step removed recently — and each change would otherwise
mean a schema migration over live enquiry data.

**Sending is never blocked by this.** The POST is fired without awaiting it,
and returns 200 with `saved: false` when Firebase is unconfigured or the
write fails. WhatsApp has been how this business receives enquiries for
years; trading that for a new dependency would be a bad bargain. The
WhatsApp link and both document downloads are untouched.

Travellers reach `/[locale]/my-trip/[reference]` and prove who they are with
a Firebase email-link sign-in. **The reference is not a credential** — five
characters from a 28-letter alphabet, printed on the WhatsApp message and
readable over the phone, so neighbouring codes are guessable. It says which
trip; the sign-in says who. A reference that does not exist and one
belonging to somebody else give the same answer, so the page cannot be used
to discover which references are real.

Amending re-opens the wizard via `?amend=NW-XXXXX`, seeded from the stored
payload; the previous version is copied into a `revisions` subcollection
inside a transaction before the new one lands, because the team may already
have quoted against it. The email on a request is deliberately **not**
updatable by a revision — it is the key ownership is checked against.

The traveller session is a separate cookie from the admin one, with no
custom claim: proving you hold an email address must never be a step
towards the admin panel.

The admin enquiry queue that this needed arrived with phase 5, in the
"Enquiries and reviews" panel.

### Phase 5 — Reviews by invite (DONE, Firestore half unproven)

The flow: an admin opens the enquiry queue, clicks **Request a review**, and
copies the resulting `/[locale]/review/[token]` link into the WhatsApp
conversation they are already having. The traveller leaves a star rating,
text and up to four photographs. It lands as `pending`, and nothing is
public until a staff member approves it.

**Because every review traces back to an invite tied to a real enquiry, spam
is structurally impossible.** Moderation is a quality gate — is this worth
publishing — not a defence. That is the whole reason for the invite model.

**The link is the credential**, so it is 64 hex characters from
`crypto.randomUUID`, single-use, and expires after 60 days. It carries no
information about the enquiry. Redemption marks the invite used *inside a
transaction*, so two people opening the same link cannot both submit.

**Photographs are uploaded through the server, not from the browser.** The
plan said Storage rules would enforce the limits; they cannot. Rules cannot
see the decoded size of a base64 payload, and there is no signed-in account
to attribute a traveller's upload to. So `storage.rules` now denies client
writes to `reviews/` outright and `lib/reviews/store.ts` checks the count,
the decoded byte length and the content type against an allowlist before
saving. The client-side resize is a courtesy, not a control.

Rejecting a review **deletes its photographs**. A review is usually rejected
because of what it contains, and files stay publicly readable at their URLs
for as long as they exist.

Approved reviews are merged into the existing testimonials on the home page,
in the language they were written in — translating somebody's own words
about their holiday is not ours to do. `AggregateRating` JSON-LD is emitted
only from three reviews upward: a single five-star review rendered as "5.0
out of 5" is technically true, reads as puffery, and search engines are
entitled to treat it that way.

Phase 4b's missing admin enquiry queue arrived here too, since inviting
someone to review requires a list of enquiries to invite them from.

### Phase 6 — Image loading (DONE, and fully verified)

The reported slowness had three distinct causes. Two were fixed in phase 3:

1. ~~Admin itinerary images were base64 inside a JSON archive that every
   custom-tour visitor downloaded whole~~ — they now upload to Storage. This
   was the main win.
2. ~~`next.config.ts` needed `remotePatterns` and `minimumCacheTTL`~~ —
   added.

The third was the source files themselves, and that is what this phase did.
It touches no Firebase, so unlike phases 1 to 5 all of it has actually run.

- **Oversized source files.** `public/images/` was 36 MB across 61
  photographs, including a 5184x3456 / 3.9 MB
  `destinations/tissamaharama/tissamaharama.jpg` and 2.5–2.7 MB heroes.
  `scripts/optimize-images.mjs` caps the longest edge at 2400 and re-encodes
  at quality 78: **36 MB → 16 MB**, 42 of the 61 files rewritten, nothing
  visibly different. The optimiser now has far less to decode on the first
  request for each width.
- **`public/images/destinations/destinations.png`** was a 1.7 MB photograph
  saved as PNG with no transparency. Converted to `destinations.jpg`
  (497 KB) and its one reference updated. The script reports opaque PNGs
  rather than converting them, because changing the format changes the file
  name and therefore every reference.
- **Renamed `public/images/hero/hero (1).jpg`** and its three siblings to
  `hero-1.jpg`…`hero-4.jpg`. The script reports any name that would need
  escaping in a URL, so this cannot quietly come back.
- **Blur placeholders, everywhere.** There were none. `next/image` generates
  a `blurDataURL` on its own only for static imports, and almost nothing here
  is one — content files, galleries and itineraries all carry their images as
  strings. So there are three sources of placeholder, one lookup:
  - files under `public/` — generated by `scripts/optimize-images.mjs` into
    `lib/images/blurData.generated.ts` and looked up by path in
    `lib/images/blur.ts` (12 KB of manifest, 61 entries);
  - photographs an admin uploads — taken in the browser at upload time from
    the same re-encoded copy that goes to Storage, and stored on the record
    as `imageBlur`, keyed by URL;
  - photographs that predate both — generated by the migration script as it
    uploads them, so existing itineraries get placeholders too.

  **`components/ui/Photo.tsx` is now genuinely the chokepoint the previous
  handoff claimed it was.** It was used in two places; every `next/image`
  that fills its frame now goes through it, so the placeholder decision is
  made once. The two logo `<Image>`s are left alone — an SVG has no blur.

### Sequencing

Phases 0 through 5 are written and merged. **Nothing more should be built
until a real Firebase project exists**, `/api/admin/firebase-status` reports
the connection healthy, and the itinerary migration has run.

Five phases of Firebase code sit on `main` without a single line having
reached Firebase. That is a lot of surface to debug at once, and it only
gets worse with each phase added on top. Phase 6 is the exception worth
making — it depends on nothing and can be verified immediately — but the
Firebase setup should come first regardless.

## Current state

Everything written so far is **merged to `main`**:

| Phase | PR | What |
|---|---|---|
| 0, 4a | #10 | Admin security hotfix; wizard draft autosave |
| 1 | #11 | Firebase foundation |
| 2 | #12 | Admin sign-in on Firebase Auth |
| 3 | #14 | Itineraries to Firestore, images to Storage |
| 4b | #15 | Saved trips: enquiries recorded, `/my-trip`, amendments |
| 5 | #16 | Reviews by invite, moderation, enquiry queue |

Phase 6 (images) is written on `claude/phase-6-continuation-ijj28h` and,
unlike everything above it, has actually run — it needs no Firebase.

(#13 was the same work as #14; it was auto-closed when its base branch was
deleted on merging #12, and reopened as #14 against `main`.)

`tsc --noEmit`, `eslint` and `next build` are clean on `main`.

### The important caveat

**No line of the Firebase code has ever reached a Firebase project.** None
existed while phases 1, 2 and 3 were written. Unproven, therefore:
credentials and private-key handling, service account permissions, Google
sign-in, the `staff` allowlist, session cookies and revocation, every
Firestore read and write, Storage uploads, and the whole migration script.

What *is* verified is that none of it does harm while unconfigured, and that
the fallback paths and the authorisation wiring work — see "Verification
performed". Everything is written so an unconfigured environment behaves
exactly as it did before, which is why merging it changed nothing
observable.

Treat all of it as unvalidated until `/api/admin/firebase-status` returns
`{"configured": true, "reachable": true}` and a real staff account signs in
with Google. `docs/FIREBASE_SETUP_CHECKLIST.md` is the order to do that in.

**Action required before the admin panel works at all:** `ADMIN_EMAIL`,
`ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` must be set in `.env` locally and
in the Vercel environment. There are deliberately no fallbacks, so until they
are set, sign-in fails for everyone. Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`BLOB_READ_WRITE_TOKEN` is also absent from the local `.env`, so the itinerary
archive reads as empty in local development.

## Active files

All merged to `main`; grouped by the phase that introduced them.

### Phases 0 and 4a (PR #10)

- `lib/admin/session.ts` — fallback credentials removed
- `lib/admin/rateLimit.ts` — new
- `app/api/admin/session/route.ts` — rate limiting wired in
- `app/api/itineraries/route.ts` — hidden records withheld from the public
- `lib/custom-tour/draftStorage.ts` — new
- `components/custom-tour/ResumeDraftBanner.tsx` — new
- `components/custom-tour/WizardShell.tsx` — draft load/save, `RESTORE` action
- `components/custom-tour/steps/ReviewStep.tsx` — new `onSent` prop
- `content/{en,nl,es,da,fi}/ui.json` — four `resume*` strings under `customTour`
- `.env.example` — new; `.gitignore` gained a `!.env.example` negation

### Phase 1 — Firebase foundation (PR #11)

- `lib/firebase/admin.ts` — Admin SDK singleton, the only door to Firestore
- `lib/firebase/client.ts` — browser SDK, sign-in and Storage uploads only
- `lib/firebase/collections.ts` — collection and Storage path names
- `firestore.rules` — deny all client access
- `storage.rules` — public reads, admin-only itinerary writes, size and
  content-type floors on review photos
- `firebase.json`, `firestore.indexes.json` — deploy config, no indexes yet
- `app/api/admin/firebase-status/route.ts` — admin-gated connectivity probe
- `.env.example` — ten Firebase variables added
- `package.json` — `firebase ^12.19.0`, `firebase-admin ^14.3.0`

### Phase 2 — admin auth (PR #12)

- `lib/admin/auth.ts` — new; the single authorisation point. `requireAdmin`
  (async, for route handlers), `isAdminSession` (for server components),
  `createAdminSession`, `revokeAdminSession`
- `lib/admin/session.ts` — legacy `requireAdmin` and `sessionFromRequest`
  deleted so the sync version cannot be imported by mistake
- `app/api/admin/session/route.ts` — Firebase and legacy sign-in paths,
  `sameSite: "strict"`, sign-out revokes server-side
- `app/api/{itineraries,admin/itineraries,admin/translate,admin/firebase-status}/route.ts`
  — every `requireAdmin` call now awaited
- `components/admin/AdminSignIn.tsx` — Google sign-in, password form as
  fallback
- `components/admin/AdminApp.tsx` — takes `initiallySignedIn`; the mount-time
  session fetch is gone
- `app/[locale]/admin/page.tsx` — `force-dynamic`, verifies server-side
- `scripts/grant-admin.mjs` — new; grant and revoke staff access

### Phase 3 — itineraries (PR #14)

- `lib/itineraries/repository.ts` — new; the Firestore-or-blob facade
- `lib/itineraries/firestoreStore.ts` — new; one document per itinerary
- `lib/itineraries/imageUpload.ts` — new; Storage upload with inline fallback
- `lib/itineraries/store.ts` — polling replaced by refetch on tab focus
- `app/api/{itineraries,admin/itineraries}/route.ts` — call the repository
- `components/admin/ItineraryForm.tsx` — uploads instead of inlining; the
  size warning now counts only images still held inline
- `next.config.ts` — `remotePatterns` for Firebase Storage, `minimumCacheTTL`
- `scripts/migrate-itineraries.mjs` — new; dry run by default

Untouched: `lib/itineraries/blobArchive.ts` (still the fallback),
`lib/itineraries/types.ts`, `toExperience.ts`.

### Phase 4b — saved trips

- `lib/tourRequests/types.ts` — new; payload schema, statuses, reference
  generator
- `lib/tourRequests/store.ts` — new; create, get, revise (transactional),
  list
- `lib/tourRequests/travellerSession.ts` — new; traveller cookie, kept
  separate from the admin one
- `app/api/custom-tour/requests/route.ts` — new; POST to record or revise,
  GET for the amend flow
- `app/api/traveller/session/route.ts` — new; email-link sign-in exchange
- `app/[locale]/my-trip/[reference]/page.tsx` — new
- `components/my-trip/{TravellerAccess,TripSummary}.tsx` — new
- `components/custom-tour/WizardShell.tsx` — records on send, seeds from
  `?amend=`
- `content/*/ui.json` — new `myTrip` namespace; `customTour.amending` and
  `amendFailed`; **`contactHint` reworded**, because it promised "Nothing is
  stored on this site" and that is no longer true
- `app/robots.ts` — `/my-trip` disallowed

### Phase 5 — reviews

- `lib/reviews/types.ts` — new; invite, review, submission schemas, token
  generation, expiry
- `lib/reviews/store.ts` — new; invites, server-side photo storage,
  transactional redemption, moderation
- `lib/reviews/published.ts` — new; merges approved reviews into the static
  testimonials and computes the aggregate
- `app/api/reviews/route.ts` — new; public submission, token-authorised
- `app/api/admin/reviews/route.ts` — new; list and moderate
- `app/api/admin/reviews/invites/route.ts` — new; create invites
- `app/api/admin/requests/route.ts` — new; the enquiry queue
- `app/[locale]/review/[token]/page.tsx`, `components/review/ReviewForm.tsx`
  — new
- `components/admin/ReviewsPanel.tsx` — new; enquiries, invites, moderation
- `components/admin/AdminApp.tsx` — new "Enquiries and reviews" section
- `components/home/VoicesSlider.tsx` — renders stars when a quote has a
  rating
- `app/[locale]/page.tsx`, `lib/seo/jsonld.ts` — approved reviews and
  `AggregateRating`
- `lib/content/schema.ts` — optional `rating` on a testimonial
- `storage.rules` — client writes to `reviews/` now denied
- `firestore.indexes.json` — composite index for status + createdAt
- `content/*/ui.json` — new `review` namespace
- `app/robots.ts` — `/review` disallowed

### Phase 6 — image loading

- `scripts/optimize-images.mjs` — new; re-encodes `public/images/` and writes
  the blur manifest. Dry run by default; `npm run optimize-images`
- `lib/images/blurData.generated.ts` — new, generated; **do not edit by hand**
- `lib/images/blur.ts` — new; `blurFor(src)`, the lookup by public path
- `components/ui/Photo.tsx` — takes an optional `blurDataURL` and
  `aria-hidden`, and applies a placeholder when there is one
- `components/ui/ParallaxImage.tsx`, `components/home/{HeroShowcase,
  JourneyShowcase,DestinationRail,GuideFeature}.tsx`,
  `components/destinations/{DestinationIndex,DestinationGallery}.tsx`,
  `components/tours/TourRow.tsx`, `components/custom-tour/CustomTourTeaser.tsx`,
  `components/whatsapp/PlanCta.tsx`,
  `app/[locale]/destinations/[slug]/page.tsx` — every filling `next/image`
  now renders through `Photo`
- `lib/itineraries/imageFile.ts` — new `dataUrlToBlur`
- `lib/itineraries/imageUpload.ts` — `prepareItineraryImage` returns
  `{ src, blur }` rather than a bare string
- `lib/itineraries/types.ts` — `imageBlur` on `ItineraryRecord`
- `lib/itineraries/toExperience.ts`, `lib/content/schema.ts` — `imageBlur`
  carried onto `Experience`
- `components/admin/ItineraryForm.tsx` — stores the placeholders it is given
- `components/custom-tour/{ExperienceDialog,steps/JourneyPlanStep}.tsx` —
  pass the stored placeholder to `Photo`
- `scripts/migrate-itineraries.mjs` — makes a placeholder for each image it
  uploads
- `package.json` — `sharp` as a devDependency (both scripts import it
  directly; it was only in the tree as one of Next's own dependencies), and
  the `optimize-images` script
- `public/images/**` — 42 files re-encoded, four heroes renamed,
  `destinations.png` replaced by `destinations.jpg`

## Changes made

**Phase 0.** `lib/admin/session.ts` no longer falls back to a default email,
password, or signing secret; a `credentials()` helper returns `null` when any
of the three env vars is missing, `checkCredentials` and `isValidSession` both
return false in that case, `issueSession` throws, and a one-line error names
the missing variables so a locked-out operator knows why. `lib/admin/rateLimit.ts`
allows 8 sign-in attempts per IP per 15 minutes and returns `Retry-After`; its
counters are in-process, which is stated in the file — they reset on deploy and
are not shared across instances, so it slows online guessing rather than
stopping it. It becomes redundant at phase 2, when Firebase applies its own
throttling. `.env.example` documents every variable.

**Phase 4a.** `lib/custom-tour/draftStorage.ts` persists the wizard to
`localStorage` behind a zod-validated envelope with a `version` field (so an
incompatible older draft is discarded, not half-restored) and a 30-day expiry.
Every storage access is wrapped in try/catch, because `localStorage` throws
outright in some privacy modes and when a browser blocks site data — a wizard
that cannot save must still work. `isResumable()` suppresses the offer when
the draft holds nothing meaningful.

In `WizardShell.tsx` the draft is read in an effect, never during render: these
pages are prerendered per locale, `localStorage` does not exist on the server,
and a lazy `useState` initialiser would see `null` server-side and a draft
client-side — a hydration mismatch. Saving is debounced 500ms and does not
begin until the resume question is settled, so the first render cannot
overwrite the draft it is about to offer back. A new `RESTORE` reducer action
clamps the saved step against `STEP_KEYS.length`. The banner asks rather than
restoring silently, because someone returning a fortnight later to plan a
different holiday would otherwise find the form mysteriously pre-filled.
`ReviewStep` gained an `onSent` callback that clears the draft when the enquiry
goes to WhatsApp.

**Phase 1.** `lib/firebase/admin.ts` initialises the Admin SDK under a named
app, checking `getApps()` rather than a module-level flag, because Next.js
re-evaluates modules on hot reload and a second `initializeApp` under the same
name throws. It handles the private key surviving an environment variable as
one line with literal `\n`, and strips surrounding quotes, because Vercel and
`.env` files disagree about whether those are kept — this is the single most
common way a Firebase setup fails, and it fails with an opaque error.

Crucially, **nothing throws at import time.** `isFirebaseConfigured()` and the
`null`-returning accessors let the site build and serve while the migration is
half-done; `requireFirebase()` is there for code that genuinely cannot carry
on, and names the missing variables instead of failing later on a null
dereference. `lib/firebase/client.ts` mirrors this for the browser and is
deliberately limited to Auth and Storage.

`firestore.rules` denies everything. The reasoning is in the file: with every
document access going through a route handler on the Admin SDK — which
bypasses rules anyway — there is no legitimate client access to allow, and
writing none is safer than writing several nearly-right ones.
`storage.rules` is where the real logic lives, since uploads do go direct from
the browser: public reads, itinerary writes gated on an `admin` custom claim,
and size plus content-type floors on review photos. Those floors are a floor,
not the guarantee — the server must enforce the real limits again at phase 5.

`app/api/admin/firebase-status/route.ts` exists because setting the variables
feels like finishing and usually is not. It performs one real Firestore read,
so a wrong project id or a mangled key surfaces there rather than deep inside
a later feature.

**Phase 2.** Authorisation moved to `lib/admin/auth.ts` and became async,
because verifying a Firebase session cookie is a real operation.
`verifySessionCookie` is called with `checkRevoked: true`, which is what
makes removing someone take effect on their next request rather than up to
eight hours later. Sign-in requires the `staff` allowlist entry *and* the
`admin` custom claim: the claim alone could outlive someone's employment, and
a list entry alone is trivially added by anyone who reaches Firestore. The
refusal reason is logged server-side but not returned — whether an address is
on the staff list is not something an unauthenticated stranger should learn.

Sign-out revokes refresh tokens before clearing the cookie, since clearing it
only stops *this* browser presenting it and a copy taken elsewhere would keep
working. The cookie moved from `sameSite: "lax"` to `"strict"`: nothing
outside this site should ever navigate someone into an authenticated admin
action, and strict costs nothing for a panel reached by typing its address.

`scripts/grant-admin.mjs` grants and revokes. It is a script rather than an
endpoint because a route that grants administrative access is a route that
can be reached, guessed at, or left exposed by a later refactor — and there
is no bootstrap problem, since whoever deploys can run it once.

**Phase 3.** The facade in `repository.ts` exists so the migration does not
have to be atomic across a deploy. Everything reads and writes through it,
and switching storage is one `isFirebaseConfigured()` check rather than a
change at every call site.

The migration script defaults to a dry run because this is the one step that
feels irreversible, and seeing the counts — records, images, megabytes of
base64 — before anything is written is worth an extra command. It never
deletes the blob archive, and re-running is safe because images that are
already https URLs are left alone, so an interrupted run can just be
repeated. Uploaded images get a permanent download-token URL rather than a
signed one: a signed URL would expire and quietly break the page weeks
later.

**Phase 4b.** The guiding constraint was that recording an enquiry must not
be able to break sending one. Hence the un-awaited POST, the `saved: false`
response instead of an error, and validation running *before* the Firebase
check so a client bug still surfaces as a 400 even when nothing is
configured.

References are generated from an alphabet with no vowels (so a code cannot
spell a word) and no `0/O` or `1/I/L` (the characters people mistype when
copying from a screen). `create()` rather than `set()` means a collision
fails and retries instead of silently overwriting another traveller's trip.

The traveller cookie is `sameSite: "lax"`, unlike the admin cookie's
`strict`: travellers arrive by clicking a link in their email, and a strict
cookie would not be sent on that first cross-site navigation — they would
land signed out having just signed in.

Revisions are written in a transaction so the old payload is always
preserved before the new one replaces it. A half-applied amendment would
lose the version the team quoted against.

Note the copy change: `contactHint` told travellers "Nothing is stored on
this site". That was true and is no longer, so it was reworded in all five
locales. Leaving a stale privacy claim in place would be worse than the
feature is good.

**Phase 5.** The one substantive departure from the plan is where photo
limits are enforced — see the phase description. Everything else follows
from treating the invite token as a credential: transactional redemption so
a link cannot be spent twice, deletion of photographs on rejection, and a
review form that tells the traveller *which* rule they broke rather than
failing opaquely, because they are a customer doing the business a favour.

Invites are created from the enquiry's own stored name and email rather than
from anything the caller supplies. Otherwise the endpoint would be a way for
a compromised admin session to send review links to arbitrary addresses.

The moderator's email is recorded on each decision, so "who published this"
is answerable later without reading logs. It falls back to a label rather
than failing while the legacy shared password is still in use.

**Phase 6.** The re-encode is a script rather than a one-off command because
it has to be re-runnable: photographs are added to `public/images/` by hand,
and the blur manifest has to be regenerated when they are. It is idempotent —
a file already at or under roughly 0.2 bytes per pixel and within the 2400px
cap is left alone, so a second run rewrites nothing and no photograph is
re-encoded twice. It refuses to write when the saving is under ten per cent,
because a lossy re-encode for a five per cent saving is a bad trade. And it is
a dry run by default, like `migrate-itineraries.mjs`, since it overwrites the
only copy in the repository.

Two things the script reports rather than does: opaque PNGs, and names with
characters that need escaping in a URL. Both are fixed by changing a file
name, which means changing every reference to it — not something a script
walking a directory can see.

The blur manifest is 12 KB and reaches the browser, since `Photo` is a client
component. That is the cost of the feature and it is worth it: these pages are
almost entirely full-bleed photography, so an image still loading is a hole
where the page should be. Twelve pixels wide at quality 40 keeps each entry
near a hundred bytes.

`Photo` gained `aria-hidden` only because `HeroShowcase` needs it — later
slides in the rotation are decorative, and a screen reader should not be read
a new photo caption every six seconds. Moving that `<Image>` under `Photo`
would otherwise have dropped it.

`imageBlur` is a map keyed by the image's own URL rather than an array
parallel to `images`. The same map then covers the highlight photographs, and
reordering or removing an image cannot pair a photograph with somebody else's
placeholder. Nothing prunes it: a stale entry costs a hundred bytes and
matches nothing.

Every path that produces a placeholder fails soft. `dataUrlToBlur` returns
`undefined` rather than throwing, and the upload generates the placeholder
*after* the file is in Storage, outside that `try`, so nothing about a
decoration can throw away the URL of a photograph the admin just uploaded. A
record with no `imageBlur` renders exactly as it did before the field existed.

### Deviation from the approved plan

The plan said to strip hidden records from `GET /api/itineraries` outright.
**That would have broken the admin panel and risked data loss:** the admin list
*and* its JSON export both read from this same public endpoint, so hidden
itineraries would have disappeared from the admin UI and been silently dropped
from every export — destroying them on the next import-with-replace. Hidden
records are now filtered for anonymous callers and returned in full when
`requireAdmin(request)` passes.

## Failed attempts and dead ends

- **Filtering hidden records unconditionally** — see the deviation above.
  Caught by reading `store.ts` before editing, not by testing.
- **The plan's warning about serialising dates was wrong.** `DateRangeValue`
  is already `{ start: string | null, end: string | null }` in ISO form
  (`lib/tour/dateRange.ts`), so the whole wizard state is plain JSON and
  nothing needs reviving. No work was needed.
- **ESLint `react-hooks/set-state-in-effect`** rejects `setState` in an effect
  body. The first workaround wrapped the calls in a local `settle()` helper;
  it was contorted, and the rule would likely still have flagged it. Replaced
  with a scoped `eslint-disable`/`enable` pair and a comment explaining why
  reading browser-only storage once on mount is the case the rule cannot
  distinguish. Do not "fix" this by moving the read into render.
- **`npx next lint --dir …` no longer exists** in Next 16. Use
  `npx eslint <paths>`.
- **`preview_start` on a fresh port failed** — a `next dev` server was already
  running on port 3000 and Next refuses a second one. Verification used the
  existing server.
- **Browser clicks from screenshot coordinates did not land**; the screenshot
  frame and the click frame disagreed. Clicking by `ref` from a fresh
  `find`/`read_page` in the same batch works. `get_page_text` also returned
  stale text immediately after an interaction — re-read after a short wait
  before concluding anything failed.
- **Plan file and memory writes were blocked** (`EPERM` on
  `C:\Users\Isira Weerasinghe`); the 8.3 short path `C:\Users\ISIRAW~1\…`
  worked. Environment quirk, nothing to do with this repo.
- **Running `next build` while `next dev` is up killed the dev server.** They
  contend over `.next`. Stop the dev server first, or expect to restart it.
- **Phase 2 was paused, then built with a fallback.** The concern was real:
  it replaces the only working way into the admin panel, on top of Firebase
  code never proven against a real project. Rather than ship an
  all-or-nothing rewrite, the legacy password path was kept alive for
  exactly the case where Firebase is unconfigured. That is why the fallback
  exists, and why removing it is an explicit next step rather than an
  oversight.
- **Middleware for the admin route does not work.** `firebase-admin` cannot
  run in the edge runtime, so `proxy.ts` could only check whether a cookie
  is present, not whether it is valid. Verifying in the page's server
  component instead is both simpler and stronger. Do not "restore" the
  planned middleware.
- **A missing `await` on `requireAdmin` would silently disable every admin
  check** — `if (!promise)` is always false. The signed-out 401 test in the
  verification section exists specifically to catch it.

## Verification performed

Against the running dev server on port 3000:

- Filled travelers (4) and dates, advanced to step 3, reloaded — the resume
  banner appeared, and "Continue planning" restored step 3, travelers 4 and
  the date range intact.
- A deliberately corrupted draft (`"{ this is not json"`) was discarded with
  no banner and no console errors, and a clean draft written in its place.
- "Start over" cleared the stored draft and left a fresh step-1 state.
- `POST /api/admin/session` with the old default credentials
  (`naturewalksrilanka@gmail.com` / `000000`) returns **401**.
- Twelve sign-in attempts returned seven 401s then 429s — the limiter engages
  on the 9th attempt overall.

Phase 1:

- `/api/admin/firebase-status` returns 401 without an admin cookie.
- Home and custom-tour pages load in a clean tab with **no console errors**
  after `firebase` and `firebase-admin` entered the dependency tree, and the
  wizard still renders and still saves drafts.
- `tsc --noEmit`, `eslint` and `next build` clean — 140 static pages, no
  warnings.

Phase 2, with Firebase deliberately left unconfigured so the fallback path
was under test (temporary `ADMIN_*` values in a throwaway `.env.local`,
since deleted):

- Unauthenticated `/en/admin` returns the sign-in form and its HTML contains
  **no** panel markup — checked for both "Custom tour optimisation" and
  "Data and migration".
- Wrong password 401, correct password 200; `GET /api/admin/session` then
  reports `{"signedIn": true, "method": "password"}`.
- Signed in, `/en/admin` renders the panel server-side with no sign-in flash.
- **The awaited-`requireAdmin` test:** signed in, `DELETE
  /api/admin/itineraries` with no id returns 400 `missing_id` — it reaches
  the handler's own validation. After sign-out the same call returns 401, as
  do `/api/admin/translate` and `/api/admin/firebase-status`. Had any `await`
  been forgotten, the signed-out calls would have returned 400 too. Re-run
  this after touching auth.
- After sign-out, `/en/admin` again returns only the sign-in form.

Phase 3, again on the fallback path:

- `GET /api/itineraries` returns a correctly shaped archive envelope through
  the new repository.
- A valid record POSTed to `/api/admin/itineraries` passes validation and
  reaches the storage layer, failing only at the Vercel Blob call with "No
  blob credentials found". That is **pre-existing** — the blob path always
  needed `BLOB_READ_WRITE_TOKEN`, which is absent locally — and it confirms
  the route → repository → blobArchive wiring.
- The custom-tour page loads with no console errors after the store's
  polling was replaced.
- `tsc --noEmit`, `eslint` and `next build` clean.

Phase 4b, on the unconfigured path:

- `POST /api/custom-tour/requests` returns **200** with
  `{"saved": false, "reason": "not_configured"}` — sending is not blocked.
- An invalid payload returns 400 even when unconfigured, so a client bug is
  still caught.
- `GET /api/custom-tour/requests` returns 503; `/api/traveller/session`
  reports `available: false`.
- `/en/my-trip/NW-ABCDE` renders the "not available yet" notice.
- `/en/custom-tour?amend=NW-ABCDE` shows the amend-failed message rather
  than silently starting a blank trip, and suppresses the resume banner.
- `tsc --noEmit`, `eslint` and `next build` clean; the two new routes and
  the new page appear in the route table.

Phase 5, on the unconfigured path:

- All four admin review endpoints return **401** to an anonymous caller and
  **503** to a signed-in admin — authorisation is checked before
  configuration, so an unconfigured deployment never leaks whether a route
  exists to someone who may not use it.
- `POST /api/reviews` with a well-formed but bogus token returns 503
  `not_configured` rather than accepting anything.
- `/en/review/<token>` renders the "not open yet" notice.
- The admin panel's new section renders its "needs Firebase" message rather
  than a broken state.
- The home page still renders with the reviews merge in place.
- `tsc --noEmit`, `eslint` and `next build` clean.

Phase 6, which unlike everything above it needed no Firebase and is therefore
verified end to end:

- `scripts/optimize-images.mjs --commit` rewrote 42 of 61 files:
  **36 MB → 16 MB**. Re-running it reports `0 to rewrite` and
  `blur manifest: unchanged`, so it is idempotent.
- Against a production build on port 3100, `/en`, `/en/destinations`,
  `/en/tours`, `/en/destinations/ella` and `/en/custom-tour` all return 200
  and the blur placeholder markup is present in the server-rendered HTML —
  12, 17, 6, 6 and 1 blurred images respectively.
- `/images/hero/hero-1.jpg` and `/images/destinations/destinations.jpg` both
  return 200; the deleted `destinations.png` returns 404 and nothing
  references it.
- `/_next/image?url=/images/hero/hero-1.jpg&w=1920` returns 200 `image/avif`,
  so the optimiser still handles the re-encoded sources.
- Every `"/images/…"` string in `content/`, `components/`, `app/` and `lib/`
  resolves to a file that exists.
- `tsc --noEmit` and `next build` clean; `eslint .` reports one warning, the
  pre-existing `<img>` in `LocaleSwitcher.tsx`.

**Not verified:**

- **Every part of phases 1, 2 and 3 that touches Firebase.** No project
  existed while they were written. Credentials, private-key handling,
  service account permissions, Google sign-in, the `staff` allowlist check,
  session cookies, every Firestore read and write, Storage uploads and the
  whole migration script are unproven. Only the unconfigured fallback path
  has actually run.
- **No itinerary write has succeeded locally at all**, on either path:
  Firestore is unconfigured and the blob path has no token. The write code
  is therefore exercised only as far as its storage call.
- **No tour request has ever been stored, read back, or amended**, and the
  email-link sign-in has never sent an email. The whole of phase 4b is
  exercised only along its "Firebase is absent" branch. In particular the
  reference-collision retry, the revision transaction, and the traveller
  session cookie are untested.
- **No review invite has been created, redeemed or moderated**, and no
  photograph has been uploaded or deleted. The transactional redemption, the
  server-side photo limits, the composite index, and the aggregate-rating
  threshold are all untested.
- **The admin and migration halves of phase 6.** `dataUrlToBlur` in the
  browser and the migration script's `blurFor` have not run: uploading needs
  a signed-in Firebase account, and migrating needs a Firebase project. The
  code path is the same shape as the rest of phase 3's upload, and fails soft
  everywhere, but it is unproven like everything else that touches Firebase.
- The hidden-record filter ran against an empty archive, because
  `BLOB_READ_WRITE_TOKEN` is absent locally, so it has never been exercised
  against real data. The signed-in branch of that endpoint could not be
  tested either, since sign-in requires env vars that are not set.

## Next steps

These are also in `docs/FIREBASE_SETUP_CHECKLIST.md` as a tick-list, with the
reasoning and troubleshooting in `docs/FIREBASE_INTEGRATION.md`. None of them
has been done.

1. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` locally and in
   Vercel. **Nobody can reach the admin panel until this is done.**
2. Create the Firebase project: Firestore in native mode, Authentication with
   email-link and Google providers, and Storage. Generate a service account
   key and fill the ten Firebase variables in `.env`.
3. Sign in with the shared password (still the active path while Firebase is
   unconfigured) and open `/api/admin/firebase-status`. It must return
   `{"configured": true, "reachable": true}` before anything else is worth
   trying.
4. Deploy the rules: `firebase deploy --only firestore:rules,storage:rules`.
5. Have each staff member open `/en/admin` and click **Continue with
   Google** once. It will be refused — that is expected, and it creates the
   Firebase account. Then grant them access:

   ```bash
   node --env-file=.env scripts/grant-admin.mjs someone@example.com
   ```

   They must sign out and back in, because the claim only reaches a fresh
   token. Revoke with the same command plus `--revoke`.
6. **Once at least one staff account signs in successfully, delete the
   legacy password path** — the legacy branch in
   `app/api/admin/session/route.ts`, `PasswordSignIn` in `AdminSignIn.tsx`,
   `lib/admin/session.ts`, `lib/admin/rateLimit.ts`, and the three `ADMIN_*`
   variables. Until this is done the shared password still works whenever
   Firebase is unconfigured, which includes any deployment that loses its
   Firebase variables.
7. With `BLOB_READ_WRITE_TOKEN` present, confirm the admin list and JSON
   export still contain hidden itineraries while an anonymous
   `GET /api/itineraries` omits them.
8. **Migrate the itineraries.** Take a JSON export from the admin panel
   first — that is the backup. Then:

   ```bash
   node --env-file=.env scripts/migrate-itineraries.mjs
   ```

   Read the counts, and only then re-run with `--commit`. Afterwards check
   the admin list and the custom-tour page, confirm photographs load from
   `firebasestorage.googleapis.com`, and confirm translations survived.
   **Only once all that is right**, delete the `itineraries/archive.json`
   blob by hand, remove `lib/itineraries/blobArchive.ts` and its branch in
   `repository.ts`, and drop `@vercel/blob`.
9. **Enable email-link sign-in** in Firebase Authentication (it is a
   separate provider from Google) and add the production domain to the
   authorised domains list, or the emailed links will be rejected.
10. Send one test enquiry, confirm the `tourRequests` document appears, open
    `/my-trip/<reference>`, sign in with the emailed link, and amend it —
    then confirm a `revisions` subcollection document was written and the
    original payload survived.
11. **Deploy the Firestore indexes** alongside the rules
    (`firebase deploy --only firestore`), or listing reviews by status will
    fail with a link to create the index by hand.
12. Send yourself a review invite from the admin panel, submit a review with
    photographs, and confirm: the invite cannot be reused, an expired one is
    refused, a rejected review's photographs are actually gone from Storage,
    and an approved one appears on the home page in the right language.
13. ~~Then phase 6.~~ Done — see above. Two things to check once Firebase is
    real, since they could not be tested without it: that a photograph
    uploaded from the admin form writes an `imageBlur` entry keyed by its
    Storage URL, and that `migrate-itineraries.mjs` writes one for each image
    it uploads.

When photographs are added to `public/images/` from now on, run
`npm run optimize-images` and then `node scripts/optimize-images.mjs --commit`.
It caps the source size and regenerates `lib/images/blurData.generated.ts`; a
file that never goes through it simply has no placeholder, which is not an
error but is a missed opportunity.

Per `AGENTS.md`, read the relevant guides in `node_modules/next/dist/docs/`
(route handlers, proxy/middleware, caching and `revalidateTag`, image config)
before starting phases 1–3 — this is Next.js 16 and its APIs differ from
older versions.
