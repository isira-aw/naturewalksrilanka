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

Phases 0, 1, 2, 3 and 4a are **written**. Phases 4b, 5 and 6 are designed but
unstarted. Everything touching Firebase is written but unproven — see
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

Phases 0, 1 and 4a are shipped; 2 and 3 are written and awaiting a real
Firebase project. Nothing further should be built until
`/api/admin/firebase-status` reports the connection healthy and the
itinerary migration has actually run — three phases of unverified Firebase
code is already more unproven work in flight than is comfortable. Then 4b,
5, 6. Every phase is deployable on its own; resist merging them.

## Current state

Phases 0, 1 and 4a are **merged to `main`** — PR #10 (security hotfix and
draft autosave) and PR #11 (Firebase foundation). Phases 2 and 3 are on
`claude/firebase-phase-2-admin-auth` (PR #12) and
`claude/firebase-phase-3-itineraries`. `tsc --noEmit`, `eslint` and
`next build` are clean throughout.

**The Firebase half of phases 1 and 2 remains unproven.** No Firebase project
existed while either was written, so no line of that code has reached a real
project. What *is* verified is the fallback behaviour and the authorisation
wiring — see "Verification performed". Until
`/api/admin/firebase-status` returns `{"configured": true, "reachable":
true}` and a real staff account signs in, treat Google sign-in as untested.

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

### Phase 1 (PR #11)

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

### Phase 2

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

### Phase 3

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
9. Then 4b, 5, 6.

Per `AGENTS.md`, read the relevant guides in `node_modules/next/dist/docs/`
(route handlers, proxy/middleware, caching and `revalidateTag`, image config)
before starting phases 1–3 — this is Next.js 16 and its APIs differ from
older versions.
