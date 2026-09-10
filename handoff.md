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

Phase 0 and phase 4a are **done**. Everything else is designed but unstarted.

### Phase 0 — Security hotfix (DONE)

`lib/admin/session.ts` shipped with `ADMIN_PASSWORD` defaulting to `"000000"`
and `ADMIN_SESSION_SECRET` defaulting to a string committed in the repository,
and neither was set in `.env`. The session token's only payload is a
timestamp, so anyone holding that public fallback secret could mint a valid
`nwsl_admin` cookie **without ever knowing the password**. Fixed here.

### Phase 1 — Firebase foundation (TODO)

Create the project; enable Firestore (native mode), Authentication (email link
+ Google) and Storage. Add `firebase` (browser) and `firebase-admin` (server).
`lib/firebase/client.ts` for sign-in and direct-to-Storage uploads only;
`lib/firebase/admin.ts` as a `server-only` singleton behind a
`getApps().length` guard, because hot reload re-initialises modules.

**Architectural rule: every Firestore read and write goes through a server
route handler using the Admin SDK; the client SDK never touches Firestore.**
Security Rules therefore deny all client access outright (`allow read, write:
if false`), which is far easier to get right than per-collection rules. Storage
rules allow admin writes and public reads of the images path only.

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

Phase 0 and phase 4a are implemented on
`claude/firebase-plan-security-draft-autosave`. `tsc --noEmit` and `eslint`
are clean. Behaviour was verified against a running dev server (see below).
`next build` was **not** run.

**Action required before the admin panel works again:** `ADMIN_EMAIL`,
`ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` must be set in `.env` locally and
in the Vercel environment. There are deliberately no fallbacks now, so until
they are set, sign-in fails for everyone. Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`BLOB_READ_WRITE_TOKEN` is also absent from the local `.env`, so the itinerary
archive reads as empty in local development.

## Active files

Changed:

- `lib/admin/session.ts` — fallback credentials removed
- `app/api/admin/session/route.ts` — rate limiting wired in
- `app/api/itineraries/route.ts` — hidden records withheld from the public
- `components/custom-tour/WizardShell.tsx` — draft load/save, `RESTORE` action
- `components/custom-tour/steps/ReviewStep.tsx` — new `onSent` prop
- `content/{en,nl,es,da,fi}/ui.json` — four `resume*` strings under `customTour`

Added:

- `lib/admin/rateLimit.ts`
- `lib/custom-tour/draftStorage.ts`
- `components/custom-tour/ResumeDraftBanner.tsx`
- `.env.example`

Worth reading before phases 1–3, untouched so far: `lib/itineraries/`
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
- `tsc --noEmit` and `eslint` clean.

**Not verified:** the hidden-record filter ran against an empty archive,
because `BLOB_READ_WRITE_TOKEN` is absent locally, so it has never been
exercised against real data. The signed-in branch of that endpoint could not
be tested either, since sign-in now requires env vars that are not set.

## Next steps

1. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` locally and in
   Vercel. **Nobody can reach the admin panel until this is done.**
2. With `BLOB_READ_WRITE_TOKEN` present, confirm the admin list and JSON
   export still contain hidden itineraries while an anonymous
   `GET /api/itineraries` omits them.
3. Run `next build` before merging.
4. Create the Firebase project and supply credentials, then start phase 1.
5. Phases 2 → 3 as one block, then 4b, 5, 6.

Per `AGENTS.md`, read the relevant guides in `node_modules/next/dist/docs/`
(route handlers, proxy/middleware, caching and `revalidateTag`, image config)
before starting phases 1–3 — this is Next.js 16 and its APIs differ from
older versions.
