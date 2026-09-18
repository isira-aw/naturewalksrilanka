# Plan — admin panel: speed, customer documents, access control, custom-tour options, LLM clarity

Branch: `claude/dazzling-ptolemy-jzkd32`, from `main` (`2951fea`).

This plan continues from `handoff.md`. Read that first; everything below
assumes its **Known issues** and **Failed attempts** sections are still true.

Five concerns were raised. They are treated here as five workstreams, A–E, and
the sequencing at the end says which order they are actually built in and why
that is not the order they were raised in.

---

## The one thing that constrains all of it

**No Firebase project has ever been connected** (`handoff.md` → *Current
state*). Workstreams B, C and D all read and write Firestore or Firebase Auth.
Everything in them can be written, typechecked, linted and built — none of it
can be *proven* until a project exists and `docs/FIREBASE_SETUP_CHECKLIST.md`
has been worked through.

That is not a reason to wait. It is a reason to say plainly, at the end of
each phase, which parts have been exercised and which have only been compiled.

---

## A — The admin panel is slow

### What is actually happening

Four separate causes, measured against the code rather than guessed:

1. **One bundle for every section.** `components/admin/AdminApp.tsx` is a
   single `"use client"` component that statically imports `ItineraryList`,
   `ItineraryForm` (442 lines), `ReviewsPanel` (400), `TranslationsPanel`
   (198) and `DataPanel` (140). Opening the panel to answer one review still
   downloads and parses the itinerary editor, the image-upload code and the
   translation grid. Nothing is code-split, because nothing is dynamically
   imported.

2. **The whole itinerary archive is fetched on mount, always.**
   `AdminApp` calls `useItineraries()` at its top level, so
   `GET /api/itineraries` fires before you have chosen a section. That
   endpoint returns the *entire* archive: every record's `content1`,
   `content2`, every highlight, every `imageBlur` entry, and **all five
   locales' translations inline** (`translations` on `itineraryRecordSchema`).
   A list of forty itineraries is a large JSON document, and records written
   before uploads were mandatory may still hold base64 data URLs in `images`,
   which inflates it further.

3. **No summary projection.** There is one read shape for everything. The list
   view needs a title, a category and a status; it is handed the full prose
   and five translations of it.

4. **Every request re-verifies the session against Google.**
   `lib/admin/auth.ts` calls `verifySessionCookie(cookie, true)` — the `true`
   is `checkRevoked`, which forces a network round trip to Google's servers.
   This happens once in the server render of `app/[locale]/admin/page.tsx`
   and again inside every single `/api/admin/*` handler. Loading a section
   that makes three API calls pays for four of these.

### What will be done

- **A1 — Split the sections into real routes.**
  `app/[locale]/admin/` becomes a layout holding the sidebar, with
  `itineraries/`, `reviews/`, `translations/`, `customers/`, `access/`,
  `ai/` and `data/` as leaf pages. Next then code-splits per section for
  free, and a deep link to one section becomes possible.

  **Loading UI goes in a `<Suspense>` inside each page, never in a
  `loading.tsx`.** `handoff.md` → *Failed attempts* §1: a `loading.tsx` above a
  page that can call `notFound()` turns every 404 under it into a soft 200,
  and every one of these pages calls `notFound()` on a bad locale segment.
  `app/[locale]/custom-tour/loading.tsx` stays where it is; no new
  `loading.tsx` is added anywhere.

- **A2 — Fetch itineraries only where they are used.** `useItineraries()`
  moves out of the shell and into the Itineraries and Translations pages.
  Reviews, Customers, Access and AI stop paying for it entirely.

- **A3 — A summary projection.** `GET /api/itineraries?view=summary`
  (admin only) returns `id`, `slug`, `head`, `category`, `province`,
  `hidden`, `updatedAt`, the first image URL, and a per-locale translation
  *status* — no prose, no highlights, no translated bodies, no blur map. The
  list renders from this; the form fetches the one full record being edited.
  This is the largest single payload win available.

- **A4 — Stop re-verifying the same cookie four times per page.**
  Two layers, both conservative:
  - Wrap the verification in React's `cache()` so one server request never
    verifies twice.
  - A short process-level cache (60 s, keyed by a SHA-256 of the cookie) for
    **read** paths only. Writes keep `checkRevoked: true` unconditionally.

  **The trade-off, stated plainly:** revoking someone's access currently takes
  effect on their next request; with this it takes effect on reads within 60
  seconds, and on any write immediately. If that is not acceptable, A4 is
  dropped and A1–A3 still deliver most of the improvement. This one is
  yours to decide.

**Expected effect:** first paint of the panel stops waiting on an archive
fetch; each section downloads only its own code; the Reviews and Customers
sections make one request instead of two.

---

## B — See what a customer did, and rebuild their document *(the priority)*

### Where this stands today

The custom-tour wizard writes an enquiry to the `tourRequests` collection —
reference, email, locale, status, and the traveller's full answers as
`payload`. Amendments are versioned into a `revisions` subcollection.

But **the admin side of it was deleted in the last round** (`handoff.md` →
*Reviews stopped depending on enquiries*): the Enquiries section,
`/api/admin/requests`, `listRequests` and its Firestore index are all gone.
Nothing in the panel reads that collection any more. Only
`/my-trip/<reference>` does.

And the document — the PDF and the Word file — is built **entirely in the
traveller's browser** (`lib/journey-document/`, every entry point marked
`"use client"`, jsPDF loaded on demand). Once they close the tab, nothing
remains. The team cannot see it, re-download it, or open it in Word.

### The key realisation

`buildJourneyDocument` and `buildJourneyPlan` are **pure functions** of things
the stored `payload` already contains: the selected itinerary slugs, the date
range, traveller count, interests, accommodation choices and the contact
fields. `buildJourneyPlan` says so itself — *"Everything here is arithmetic on
the traveller's own choices. Nothing is generated or invented, which is what
makes the same selection always produce the same plan."*

So the document can be **rebuilt exactly**, from the panel, with no stored
file — provided the itineraries it referenced have not changed since.

### What will be built

- **B1 — A Customers section.** A paginated list of `tourRequests`: reference,
  name, email, country, travellers, dates, status, when it came in, how many
  times it has been revised. Search by reference, email or name; filter by
  status.

- **B2 — `GET /api/admin/requests`, reinstated but bounded.** The deleted
  `listRequests` comes back with a cursor and a `limit` — not the unbounded
  version that was removed. A `createdAt desc` index is added to
  `firestore.indexes.json`.

- **B3 — A detail view.** The full payload, the status moved along
  (`received → in-progress → quoted → confirmed → closed`) through a `PATCH`,
  and the revision history read from the `revisions` subcollection, shown as
  what changed between versions.

- **B4 — Rebuild the document, in the panel. PDF first.**
  - `lib/journey-document/fromWizard.ts` holds a pure function behind a
    `"use client"` directive. The pure part moves to a shared module so the
    admin can use it too.
  - New `lib/journey-document/fromRequest.ts`: given a `TourRequest`, the
    itinerary records and a locale, it resolves slugs through
    `recordToExperience`, runs `buildJourneyPlan`, and returns the same
    `JourneyDocument` the traveller's browser built.
  - Labels come from the `next-intl` messages for the **request's own
    stored locale**, so the rebuilt file is in the language the traveller
    read. An override lets the team pull an English copy for themselves.
  - Two buttons on the detail view: **Download PDF** and **Download Word**,
    both going through the existing `downloadJourneyDocument`. The Word file
    is HTML with a `.doc` extension and an `application/msword` type
    (`lib/journey-document/word.ts`) — Word opens it and keeps the layout,
    which is exactly the "edit it in Microsoft Word" case.

- **B5 — Record what the traveller actually took, and pin it.**
  Two parts, and the second is a decision for you (see *Questions*):
  - A `downloads` list on the request — `{ kind, at, locale }` — written when
    a download succeeds on the review step. This answers "what did they
    download, and when".
  - **A snapshot of the resolved document.** At send time, store the built
    `JourneyDocument` JSON (image *URLs* only, no binary — roughly 10–40 KB)
    on the request. The rebuild then reproduces the traveller's file
    faithfully even if an itinerary is later edited or deleted. **This is
    the recommended option.** Without it, the rebuild uses today's itinerary
    data and can differ from what they received; the panel would then have to
    warn when a referenced slug is missing or was edited after the enquiry
    came in — which it will do either way, as a safety net.

- **B6 — Generation stays in the browser.** Reusing the proven client-side
  renderer in the admin page is far less work and cannot drift from what the
  traveller gets. A server-side renderer only becomes necessary if these are
  ever to be *emailed*; that is out of scope here and noted as a follow-up.

- **B7 — Bound the enquiry endpoint while we are here.** `handoff.md` →
  *Known issues* §2: `POST /api/custom-tour/requests` has no auth, no rate
  limit, no honeypot, and no `.max()` on `name`, `requirements` or
  `accommodationNotes`. One request can push about a megabyte into Firestore.
  It matters more once a person is looking at that collection daily, so it is
  fixed as part of this workstream rather than left on the list.

---

## C — Anyone can reach the admin sign-in, and junk accounts appear in Firebase

### The precise cause

The panel itself is **not** insecure. `lib/admin/auth.ts` requires a Firebase
Google sign-in **and** an `admin: true` custom claim **and** a `staff`
document in Firestore. A stranger gets a 403 and nothing else.

The problem is one step earlier. `AdminSignIn.tsx` calls
`signInWithPopup(auth, new GoogleAuthProvider())`. Firebase **creates the user
account the instant the Google consent completes** — before the server has
looked at anything. Only *then* does `/api/admin/session` check the allowlist
and refuse. The rejected person cannot get in, but their account is now a
permanent row in the NatureWalks project's Authentication list.

So: access control is working; the **account list is being polluted** by
everyone who finds the page and presses the button once.

### What will be done, in layers

- **C1 — Delete the account that was just rejected.** In `createAdminSession`,
  when the outcome is `not_staff` or `not_admin`, delete the Auth user —
  under a deliberately narrow rule, so a real person is never destroyed by
  accident:
  - the account's only provider is `google.com`, **and**
  - it was created within the last few minutes (so it was made by this very
    attempt, not an existing account), **and**
  - the address is not on `staff` and has no `tourRequests` document.

  Anything outside that rule is left alone and logged. This is what stops the
  list filling up.

- **C2 — Throttle and record refused attempts.** A Firestore-backed counter
  per address and per IP on `POST /api/admin/session`. It must be
  Firestore-backed, not in-process: the previous in-memory limiter was
  removed precisely because it does not survive serverless instances. Refused
  attempts are recorded so repeated probing is visible rather than invisible.

- **C3 — The real fix, which needs your Firebase plan.** A Firebase Auth
  **`beforeCreate` blocking function** rejects any sign-in whose address is
  not on the staff allowlist, so **the account is never created at all**. That
  is the correct answer to this problem; C1 is cleanup after the fact.
  Blocking functions need Identity Platform, i.e. the **Blaze** plan. The
  function source and the console steps will be written into `docs/` either
  way, marked as pending your decision.

- **C4 — An Access section in the panel.** The current `staff` list, with add
  and remove. An existing admin adding someone can also set their `admin`
  claim from the server (`setCustomUserClaims`), so the panel becomes
  self-sufficient — the *first* admin still comes from
  `scripts/grant-admin.mjs`, because there has to be someone to press the
  button. Recent refused sign-in attempts are shown here too.

- **C5 — A pruning script.** `scripts/prune-auth-users.mjs` lists Auth users
  with no `staff` document, no `tourRequests` and no review, and reports them.
  **Dry-run by default**; deleting requires an explicit flag. This clears the
  accounts that have already accumulated.

---

## D — More options in the panel for `/custom-tour`

Today the panel's entire custom-tour surface is itinerary CRUD. Proposals,
roughly in order of how much they are worth:

- **D1 — Explicit stay length per itinerary.** `buildJourneyPlan` derives how
  many days a stop takes by parsing the `duration` *prose* (`stopDays`), with
  a silent fallback of 2. A numeric `stayDays` field makes the plan say what
  the team means instead of what a parser guessed.

- **D2 — Explicit coordinates per itinerary.** `locateItinerary` matches the
  location text against a place list and, failing that, **falls back to the
  centre of the province**. A stop can therefore be drawn tens of kilometres
  from where it is — on the wizard map *and* in the printed PDF. An optional
  lat/lng field per itinerary fixes the routing, the distances and the map in
  one change. This is the biggest quality win available for the PDF.

- **D3 — Ordering and featuring.** A `sortOrder` or `featured` flag, so the
  team controls which suggestions a traveller sees first rather than
  alphabetical-by-title.

- **D4 — Wizard settings**, in a `settings/customTour` document, editable in
  the panel: maximum travellers (currently hard-coded to 12 in
  `requestPayloadSchema`), which interest categories and accommodation options
  are offered and in what order, and the notice text printed on the document.

- **D5 — A preview.** Build and download the PDF for any *draft* selection
  from the panel, without going through the wizard — so a change to an
  itinerary can be checked against the actual printed output.

Which of these are worth building is a question for you, not a decision for
me — see *Questions*.

---

## E — A clear picture of what the LLM does

### What it is, today, completely

There is **exactly one** LLM call in this repository.

| | |
|---|---|
| Where | `lib/ai/translateItinerary.ts`, the only file in `lib/ai/` |
| Reached from | `POST /api/admin/translate`, admin-only, from the Translations panel |
| Provider | Google Gemini, via `@google/genai` |
| Model | `gemini-3.6-flash`, hard-coded |
| Job | Translate one itinerary's text into one locale |
| Sent | `head`, `bestTime`, `suggestedLength`, `content1`, `content2`, `highlights` — itinerary copy only |
| **Never sent** | **Any customer data. No name, email, phone, enquiry or review ever reaches Gemini.** |
| Constrained | A JSON response schema, `temperature: 0.2`, 4096 output tokens |
| Checked | Parsed against `translatableSchema`, and rejected if the highlight count changed |
| On failure | Returns a reason, never throws; the itinerary stays untranslated and is retried by hand |

And what is **not** AI, which matters just as much: the journey plan, the
driving order, the day allocation and the distances are plain arithmetic
(`lib/journey/plan.ts`). There is no chatbot. Nothing on the public site calls
a model.

### What will be done

- **E1 — `docs/llm.md`.** The table above, in full: what leaves the site, what
  does not, the model and why, cost per call, every failure mode, how to
  retry, how to change model, and an explicit statement that no customer data
  is involved.

- **E2 — An AI section in the panel.** Whether `GOOGLE_AI_API_KEY` is
  configured, which model is in use, the recent translation outcomes per
  itinerary and locale with the reason for each failure, and a **test
  connection** button.

- **E3 — Make the model id configurable and verify it.** `handoff.md` flags
  that `gemini-3.6-flash` has never run against a real key and may not be a
  current id. It becomes `GOOGLE_AI_MODEL` with a documented default, so a
  wrong id is an environment-variable change rather than a deploy. The test
  button in E2 is how it gets verified for real, rather than guessed at here.

---

## Sequencing

The PDF work is the priority, but **A1 is built first** — it is the container
the Customers section lives in, and building B into the old single-component
shell would mean building it twice. A1 is small.

| Phase | Work | Verifiable without Firebase? |
|---|---|---|
| **0** | Branch, baseline `tsc` / `eslint` / `next build` green, confirm the `jose` override survives in the lockfile | yes |
| **1** | **A1** route split (+ A2, A3) | yes — bundle sizes and navigation |
| **2** | **B1–B4, B7** — Customers section, detail view, **PDF and Word rebuild** | build only; needs Firestore to prove |
| **3** | **B5** — download log and document snapshot | build only |
| **4** | **C1, C2, C4, C5** + `docs/` for C3 | build only; needs Auth to prove |
| **5** | **D** — whichever items you pick | partly |
| **6** | **E1–E3** — docs and the AI section | E1 yes; E2/E3 need a key |
| **7** | **A4**, if you want it, measured rather than assumed | yes |

Each phase is its own commit, `tsc` + `eslint` + `next build` clean before it
lands, and — per *Failed attempts* §2 — `packages[""].overrides` in
`package-lock.json` is checked after any `npm install`.

---

## Questions

1. **Is Firebase connected yet?** Everything in B, C and D touches Firestore
   or Auth. If there is still no project, I will build and compile it all and
   say clearly at each phase what has only been compiled — but none of it can
   be tested.

2. **Firebase plan — Spark or Blaze?** This decides C3. On Blaze, a
   `beforeCreate` blocking function stops the junk account from ever being
   created, which is the real fix. On Spark, C1's after-the-fact deletion is
   the best available and the list will still briefly contain each attempt.

3. **Document fidelity (B5).** Three options:
   - **Rebuild live** — nothing stored; can drift if an itinerary is edited.
   - **Snapshot the document JSON** — ~10–40 KB per enquiry, faithful,
     survives itinerary edits and deletions. **My recommendation.**
   - **Store the rendered PDF itself** on Cloudinary — byte-identical, but it
     means letting an unauthenticated visitor upload a file, which is a
     security surface I would rather not open for this.

4. **Which of D1–D5 do you actually want?** D2 (real coordinates) is the one
   I would push for — it is currently the largest source of error in the
   printed map, which is the document you care most about.

5. **A4's trade-off** — is a 60-second delay on revoking someone's read
   access acceptable in exchange for cutting a network round trip from every
   admin request? If not, it is dropped and nothing else changes.

---

## Decisions taken

Answered 2026-09-18. These are settled; the options they replace are struck
out above rather than deleted, so the reasoning stays readable.

| Question | Answer | What it changes |
|---|---|---|
| Firebase | **Connected, Spark (free) plan** | **C3 is off the table.** Blocking functions need Identity Platform, which needs Blaze. C1 — deleting the account immediately after it is refused — becomes the fix rather than the cleanup. `docs/` will still carry the blocking-function recipe, marked as what to do if the project ever moves to Blaze |
| Document fidelity | **Snapshot the document JSON** | B5 builds the snapshot. The rebuild is faithful even after an itinerary is edited or deleted, and no binary is stored anywhere |
| `/custom-tour` options | **All four**: coordinates, stay-length, ordering/featured, wizard settings | D1–D4 are all in scope. D5 (draft preview) was not asked for and is dropped |
| Session cache | **Safe option — skip it** | **A4 is dropped.** Revoking access stays immediate. A1–A3 carry the speed work on their own |

Two consequences worth stating plainly:

- **Spark means each refused attempt still creates an account for a moment.**
  C1 deletes it within the same request, so it does not persist in the
  Authentication list — but it is a deletion after the fact, not a refusal
  before the fact. That is the best available on this plan.
- **A4 being dropped means the Google round trip per request stays.** The
  panel will still be markedly faster from A1–A3 (less code, fewer bytes,
  fewer requests), but the per-request auth latency is unchanged, by choice.
