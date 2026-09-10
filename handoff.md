# Handoff — Firebase migration plan, admin security hotfix, wizard draft autosave

> Replaces an earlier handoff at this path describing the admin-authored
> itineraries work (merged as PR #9). That work is done and is not described
> here. Delete this file before merge if the team does not keep handoff notes
> in-tree.

## Goal

Two things were asked for, and they are at very different stages.

1. **Analyse the codebase and plan a move to Firebase**, covering user flow
   management, itinerary management, a customer review section, smoother image
   loading, and admin panel security. The full plan is below; most of it is
   not built yet.
2. **Fix what could be fixed without Firebase credentials.** That turned out
   to be the two most urgent items — a live admin authentication hole and the
   wizard losing a traveller's work on refresh. Both are implemented and
   verified in this branch.

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

Phases 0, 1 and 4a are **done**. Everything else is designed but unstarted.

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

### Phase 2 — Admin auth on Firebase Auth (TODO)

Replaces `lib/admin/session.ts` entirely. `AdminSignIn.tsx` gets an ID token
from the client SDK and POSTs it; the route verifies with `verifyIdToken`,
checks the `staff` allowlist **and** an `admin: true` custom claim, then mints
a Firebase session cookie (httpOnly, secure, `sameSite: "strict"`). Replace
`requireAdmin(request)` with a `verifySessionCookie` helper of the same call
shape, so each `/api/admin/*` route changes in one line.

**Add real middleware.** `proxy.ts` currently runs only next-intl and its
matcher excludes `/api`, so `/[locale]/admin` is served to everyone and gating
happens in the client. The admin check must *compose with* the existing
next-intl middleware, not replace it. Set the `admin` claim from a one-off
script, never an HTTP endpoint.

### Phase 3 — Itineraries to Firestore + Storage (TODO)

One document per itinerary instead of the single `itineraries/archive.json`
blob. This also removes a real bug: `lib/itineraries/blobArchive.ts` does a
whole-file read-modify-write with no locking, so two admins saving at once
silently overwrite each other.

Keep the `ItineraryRecord` shape from `lib/itineraries/types.ts` (including the
per-locale `translations` map) so `toExperience.ts`, `ItineraryForm.tsx` and
the wizard barely change; reuse the existing zod schemas for write validation.
**Images move from base64 data URLs to real files in Storage** — keep the
client canvas resize in `lib/itineraries/imageFile.ts`, upload the blob, store
the URL. Drop the 30-second poll in `store.ts#subscribe`; refetch on window
focus and after mutations. Cache the public read with `revalidateTag` on write
instead of `force-dynamic` on every request.

Migration: a one-off script reads the existing blob, uploads each embedded
base64 image, and writes one document per record. Run against a copy first;
keep the blob until verified, then remove `@vercel/blob`.

### Phase 4 — Traveller flow (4a DONE, 4b TODO)

**4a — draft autosave.** No backend. Done; see below.

**4b — persisted submissions.** `POST /api/custom-tour/requests` writes a
`tourRequests` document: a short human `reference` (e.g. `NW-7K3QD`), email,
locale, status, the whole wizard state as a `payload` map (so wizard changes
don't force a migration), timestamps, and a `revisions` subcollection.
`ReviewStep.tsx` POSTs *before* opening WhatsApp — the WhatsApp link and both
document downloads stay exactly as they are; this is purely additive.
Travellers reach `/[locale]/my-trip/[reference]` through a Firebase Auth email
link, with an "Amend this trip" button that seeds the wizard from the stored
payload and writes a revision. Side benefit: the admin panel finally gets an
enquiry queue instead of a WhatsApp inbox.

### Phase 5 — Reviews by invite (TODO)

1. Admin opens a completed request, clicks "Request a review" — creates a
   `reviewInvites` document with a cryptographically random token, the request
   id, a ~60 day expiry, and `usedAt: null`.
2. The panel shows a copyable `/[locale]/review/[token]` link for staff to
   paste into WhatsApp or email. **The link is the credential**, so it must be
   unguessable, single-use and expiring.
3. The page takes a star rating, text, and photos uploaded to Storage under a
   token-scoped path. File count, size and content-type limits are enforced
   **server-side**; client-side limits are advisory only.
4. Submission writes a `reviews` document with `status: "pending"` and marks
   the invite used.
5. Admin approves or rejects in a new panel section. **Photos need moderating
   too, not just text.**
6. Approved reviews render publicly: add a `rating` field to
   `testimonialSchema` in `lib/content/schema.ts` and have `VoicesSlider.tsx`
   merge approved Firestore reviews with the existing static JSON, so today's
   empty-state behaviour still works.
7. Add `AggregateRating` / `Review` JSON-LD via `lib/seo/jsonld.ts`.

Because every review traces back to an invite tied to a real request, spam is
structurally impossible and moderation is a quality gate rather than a filter.

### Phase 6 — Image loading (TODO)

The reported slowness has three distinct causes, in order of impact:

1. **Admin itinerary images are base64 inside a JSON archive that every
   custom-tour visitor downloads whole.** Base64 is ~33% larger than binary,
   is never optimised by `next/image`, and cannot be cached separately. Phase
   3 fixes this by design — it is the main win.
2. **Oversized source files.** 83 files, ~35 MB under `public/images/`, with a
   3.9 MB `destinations/tissamaharama/tissamaharama.jpg` and 2.5–2.7 MB heroes.
   Re-encode before they reach the optimiser. Also rename
   `public/images/hero/hero (1).jpg` and friends — spaces and parentheses in
   URLs cause subtle bugs.
3. **`next.config.ts`.** Needs `remotePatterns` for the Firebase Storage host
   (without it `next/image` will refuse the new URLs) and `minimumCacheTTL`.
   `formats: ["image/avif", "image/webp"]` is already correct.

Then blur placeholders — there are none anywhere today. Static imports get
`blurDataURL` free; for Storage URLs generate a tiny base64 blur at upload
time and store it on the document. Thread it through `components/ui/Photo.tsx`,
the shared chokepoint for nearly every content image.

### Sequencing

Phase 0 first (done). Then 1 → 2 → 3 as one block — that is the real
migration. 4a is independent and already shipped. Then 4b, 5, 6. Realistically
several weeks. Every phase is deployable on its own; resist merging them.

## Current state

Phases 0 and 4a are **merged to `main`** (PR #10). Phase 1 is on
`claude/firebase-phase-1-foundation`. `tsc --noEmit`, `eslint` and
`next build` are clean on both.

**Phase 1 is written but unproven.** No Firebase project existed while it was
built, so no line of it has ever reached Firebase. What is verified is only
that it does no harm: the site builds, the home and custom-tour pages render
with no console errors, and `/api/admin/firebase-status` is admin-gated.
Whether the credentials, the private-key newline handling, and the service
account permissions actually work is unknown until someone sets the variables
and calls that endpoint. **Treat phase 1 as unvalidated until it returns
`{"configured": true, "reachable": true}`.**

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

### Phases 0 and 4a (merged)

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

### Phase 1

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

Untouched, and worth reading before phases 2–3: `lib/itineraries/`
(`blobArchive.ts`, `store.ts`, `types.ts`, `toExperience.ts`), `proxy.ts`,
`components/admin/`, `next.config.ts`.

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
- **Phase 2 was deliberately not started.** It replaces `lib/admin/session.ts`
  — currently the only working way into the admin panel — and none of the
  Firebase code beneath it has been proven against a real project. Shipping
  an unverifiable rewrite of the authentication path would risk locking
  everyone out with no way to tell whether the credentials or the code were
  at fault. Phase 1 was kept purely additive and inert for the same reason.

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

**Not verified:**

- **Every part of phase 1 that touches Firebase.** No project existed while
  it was written. Credentials, private-key newline handling and service
  account permissions are all unproven.
- The hidden-record filter ran against an empty archive, because
  `BLOB_READ_WRITE_TOKEN` is absent locally, so it has never been exercised
  against real data. The signed-in branch of that endpoint could not be
  tested either, since sign-in requires env vars that are not set.

## Next steps

1. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` locally and in
   Vercel. **Nobody can reach the admin panel until this is done.**
2. Create the Firebase project: Firestore in native mode, Authentication with
   email-link and Google providers, and Storage. Generate a service account
   key and fill the ten Firebase variables in `.env`.
3. Sign in to the admin panel and open `/api/admin/firebase-status`. It must
   return `{"configured": true, "reachable": true}`. **Do not start phase 2
   until it does** — phase 2 replaces the working admin sign-in, and building
   that on an unproven connection means debugging two things at once while
   locked out of the panel.
4. Deploy the rules: `firebase deploy --only firestore:rules,storage:rules`.
5. With `BLOB_READ_WRITE_TOKEN` present, confirm the admin list and JSON
   export still contain hidden itineraries while an anonymous
   `GET /api/itineraries` omits them.
6. Phases 2 → 3 as one block, then 4b, 5, 6.

Per `AGENTS.md`, read the relevant guides in `node_modules/next/dist/docs/`
(route handlers, proxy/middleware, caching and `revalidateTag`, image config)
before starting phases 1–3 — this is Next.js 16 and its APIs differ from
older versions.
