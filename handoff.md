# Handoff — admin panel, customer documents, access control

Branch: `claude/funny-lovelace-6jpkhk`, open as
[#37](https://github.com/isira-aw/naturewalksrilanka/pull/37).

Rounds **#25 to #36** have merged, **#34, #35 and #36 among them** — so
everything under *This round* below is shipped, not pending. It is kept
because the reasoning behind it is still the reasoning the code runs on.

#37 itself is small: the itinerary editor's *Planning* section removed as
unwanted, then the three fixes described under *Known issues* §2 and §3.

`PLAN.md`, on the same branch, carries the reasoning behind this round, the
decisions taken and what is still unproven. This file is the shorter view.

> **This file is temporary.** A previous `handoff.md` was deleted in `2e25aa2`
> because it had grown into a 967-line log of a migration that had already
> merged, and every live fact in it was duplicated in `docs/`. Do not let this
> one go the same way. Firebase is now connected, so the first of its two exit
> conditions is met; when the items under **Known issues** are closed, fold
> anything still true into `README.md` or `docs/` and delete this file.

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
warnings, on every commit of this branch.

| | |
|---|---|
| Next.js | **16.3.5** |
| `npm audit` | 0 critical, 1 high, 6 moderate — all transitive, see Next steps |
| `jose` | 5.10.0, override intact and checked after every install (see Failed attempts) |
| Firebase | **Connected, Spark (free) plan.** No Blaze, so no blocking functions — see `docs/admin-access.md` |
| Admin auth | Google sign-in. The `staff` allowlist decides; the `admin` claim is a **cache** of it, granted on first sign-in. `SUPER_ADMIN_EMAIL` admits without a `staff` document and is the recovery path |
| Traveller auth | Firebase email-link only. `/my-trip` lists their own trips; contact details are editable, nothing else |
| Data | Firestore only. **No export or import** — backups are Firestore's own |
| Files | **Cloudinary** only, since #27. Firebase Storage is gone; `storage.rules` with it |
| Deployment | Vercel only |
| Admin sections | Itineraries (translations live inside the editor), Customers, Reviews, Wizard settings, AI, Access. Every list is paged |
| Third-party hosts | Fonts self-hosted by `next/font`, flags local. Three services at runtime: Cloudinary for every photograph, OpenStreetMap tiles and OSRM routing for the journey map — see *Known issues* §3 |

**Nothing that touches Firestore or Firebase Auth on this branch has been run
against the real project.** It is all compiled and typechecked; the session
that wrote it had no credentials. `PLAN.md` → *What is still not proven* has
the list in priority order, and `discardProbeAccount` is the one to test
deliberately, because it deletes Firebase accounts.

A deployment with no Firebase variables still builds and serves every public
page; the Firebase-backed features report themselves unavailable.

### Before this branch is deployed

1. **`firebase deploy --only firestore:indexes`.** Three composites matter:
   `tourRequests` on `status` + `createdAt`, `tourRequests` on `email` +
   `createdAt`, and the reviews one. Without them the Customers status filter
   and the traveller's own trip list fail outright.
2. **Set `SUPER_ADMIN_EMAIL`**, comma-separated, more than one. Until it is
   set nobody can edit the access list — the panel says so rather than failing
   silently.
3. Optionally set `GOOGLE_AI_MODEL`, then press *Test the connection* in the
   **AI** section. The default `gemini-3.6-flash` has still never run against
   a real key.

---

## Active files

New in this round:

| File | What |
|---|---|
| `app/[locale]/admin/layout.tsx` | The gate and the frame. One session check per navigation; **no `loading.tsx` may sit beside it** |
| `lib/journey-document/fromRequest.ts` | A stored enquiry back into a `JourneyDocument`, by snapshot or by rebuild, saying which |
| `lib/admin/superAdmin.ts` | `SUPER_ADMIN_EMAIL`. Who may change access, and the lockout recovery path |
| `lib/admin/signInGuard.ts` | Deletes the account a refused sign-in just created; rate limits and records refusals |
| `lib/settings/customTour.ts` | What the wizard offers, and `TRAVELLER_CEILING` — the hard limit, distinct from the configurable one |
| `components/admin/TranslationsField.tsx` | The four other languages, inside the itinerary editor |
| `components/my-trip/ContactForm.tsx` | The only thing a traveller may change after sending |
| `app/[locale]/my-trip/page.tsx` | Their trips, found by session rather than by reference |
| `scripts/prune-auth-users.mjs` | Clears the accounts that accumulated before the guard existed. Dry-run by default |
| `docs/admin-access.md` | The junk-account problem end to end, and the blocking function for Blaze |
| `docs/llm.md` | The one LLM call: what is sent, what never is, what is not AI |
| `lib/tourRequests/rateLimit.ts` | How often one caller may have an enquiry written. Fixed buckets, no addresses stored, fails open |
| `docs/security-headers.md` | The four headers, and the four steps that turn the CSP on |

New in the earlier work:

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
| `lib/itineraries/store.ts` | The only itinerary store (Firestore). Route handlers call it directly. The browser's fetch wrapper is `browserStore.ts` |
| `firestore.rules` | Denies all client access on purpose — everything goes through route handlers |
| `lib/cloudinary/media.ts` | Every photograph in and out. Admin uploads go direct from the browser under a signature; review photographs go through the server so the size and type limits are enforced somewhere the submitter does not control |
| `lib/reviews/store.ts` | Review links, redemption inside a transaction, moderation, and the deletes that take photographs with them |
| `package.json` → `overrides` | Pins `jwks-rsa`'s `jose` to 5.x. Removing it takes the whole site down on Node 20 |

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

## This round (branch `claude/dazzling-ptolemy-jzkd32`)

Eleven pieces of work in two sittings. `PLAN.md` has the reasoning; this is
what changed and what to know about it.

### The admin panel is a set of routes now

`AdminApp` was one client component statically importing every panel, so
opening the panel to answer a review also downloaded the itinerary editor, the
image-upload code and the translation grid. It also fetched the entire
itinerary archive on mount — every record's prose, highlights and all five
locales of translation — before you had chosen a section.

Each section is its own route under `app/[locale]/admin/`, with the session
check and the sidebar in a shared layout. Measured: one 36 KB admin chunk
became four, and a section loads only its own (Reviews 12 KB, Itineraries
28 KB). Reviews makes no itinerary request at all.

**There is deliberately no `loading.tsx` anywhere under `admin/`.** Every one
of those pages calls `notFound()` on a bad locale, and a `loading.tsx` above
such a page is the soft-404 in *Failed attempts* §1. Section loading UI goes
in a `<Suspense>` inside a page, under the `notFound()` check.

### Customers, and the traveller's document

The admin view of enquiries had been removed in #29, and the journey document
was built only in the traveller's browser — once they closed the tab there was
no copy to reprint, send on, or open in Word.

`buildJourneyPlan` is arithmetic over the traveller's own choices and all of
them are in the stored payload, so the document reproduces exactly. Two paths,
and `RequestDetail` says which it used: a **snapshot** pinned when the enquiry
is sent (the traveller's own file, surviving later itinerary edits), or a
**rebuild** for enquiries predating snapshots, which resolves itineraries as
they stand today and therefore names any since deleted or edited.

Rendering stays in the browser, through the same `downloadJourneyDocument` the
wizard uses. There is no second renderer to drift from the first, and that is
the point.

### Refused admin sign-ins no longer accumulate

`signInWithPopup` makes Firebase create the account the instant the Google
consent completes, before the server checks anything — so everyone who found
`/admin` and pressed the button once became a permanent row. The account is
now deleted in the same request that refuses it, under conditions narrow
enough to be sure it was created by that attempt. `docs/admin-access.md` is
the full account, including the blocking function to deploy if this ever moves
to Blaze.

**The allowlist and the claim were described as two independent factors. They
are not, and the code now says so.** `firestore.rules` denies all client
access, so a `staff` document can only be written by an authenticated admin or
by someone holding the service account — who could set claims directly anyway.
The claim is a cache of the list, kept so `requireAdmin` answers from the
cookie without a Firestore read, and it is brought into line on first sign-in.

### Only a super admin may change access

`SUPER_ADMIN_EMAIL`, comma-separated, in the environment rather than
Firestore: a super admin recorded in the database it administers can be edited
by whatever can write to that database. Every admin reads the list; only a
super admin changes it.

It is also the recovery path — a super admin is admitted without a `staff`
document, so an emptied or badly written list no longer locks everybody out.

### Travellers can sign in

`/my-trip` lists every trip under the signed-in address, with its status. The
address comes from the session cookie and nowhere else: no parameter on the
page, none on the endpoint, nothing to tamper with.

Contact details are editable; nothing else is. The old "change this trip" link
handed them back into the wizard to redo the whole enquiry, and the team may
already have quoted against what was there. With that entry point gone, the
wizard's amend branch, `reviseRequest`, `attachDocumentSnapshot` and the `GET`
on `/api/custom-tour/requests` went too.

### Sending no longer downloads a file

The WhatsApp link fired `onDownload("doc")` alongside recording the enquiry,
so a Word file landed in the traveller's downloads for an action labelled
"submit", with no way to decline. Only the enquiry is recorded now. The button
is **"Submit and contact on WhatsApp"** in all five languages, and the hint
under it was rewritten — every locale promised a Word copy that no longer
happens.

### Two sections removed

**Data and migration**, entirely. With it went `writeAll`: a bulk "replace"
that deleted every record absent from an uploaded file, reachable by anyone
who could open the panel. Backups are Firestore's own — point-in-time recovery
and scheduled exports. `docs/itinerary-storage.md` says so now.

**Translations**, into the itinerary editor. One row per language with its own
button, next to the English it comes from. The old page offered to convert
everything outstanding, which is itineraries × four languages against a
service that fails intermittently, where one bad response mid-way leaves you
guessing what landed.

### Everything is paged

Customers already was; itineraries and reviews now are. The itinerary list
reads **summaries** — it shows a title, a category and status dots, and was
being handed two content blocks, every highlight, a blur map and four inline
translations to do it.

**The admin itinerary list is alphabetical, not in placement order**, and that
is forced rather than chosen: see *Failed attempts* §8.

Paging also forced a fix. The editor picked a record's slug by scanning every
itinerary the browser had loaded — with a paged list it sees one page and
would hand out a slug taken further down. The slug is what the wizard and the
printed documents key on, so `saveRecord` decides it on the server now.

### More of the wizard is configurable

Per itinerary: a **featured** flag, which lifts an itinerary above the
alphabetical order in both the wizard and the admin list.

The editor briefly also carried a *Planning* section — per-itinerary
coordinates, an explicit stay length and a list position. It has been removed
as unwanted, along with its fields on the record, on `Experience` and in the
admin list. Stops are placed by `locateItinerary` (location text, then the
province centre) and their length read out of the `duration` prose by
`stopDays`, which is how it worked before: known to be imprecise — the
province-centre fallback lands 35 km out on Sinharaja — and accepted.

Per deployment, in `settings/customTour`: group-size ceiling, which interests
and accommodation styles are offered, and the notice printed on the document.
Reading them never fails — an unreachable document yields the built-in
defaults, which are exactly the previous behaviour.

The traveller ceiling is deliberately two numbers. The configurable one is
what the wizard offers; a hard `TRAVELLER_CEILING` of 40 is what the server
accepts, because the enquiry endpoint is unauthenticated and its validation
must not depend on a Firestore read or on anything a caller controls.

### The LLM is written down

There is exactly one language-model call in the repository. `docs/llm.md` and
the **AI** section say what is sent (itinerary prose, already public), what is
never sent (any customer data at all — no code path exists that could), and
what is not AI: the journey plan is arithmetic, the suggestions are a filter,
there is no chatbot, nothing on the public site calls a model.

The model id is `GOOGLE_AI_MODEL` now, because Google retires ids on its own
schedule and a wrong one fails every translation with an error that reads like
an outage.

---

## Earlier round — merged as #29

#28 and #29 landed in the same sitting and the pieces refer to each other, so
they are described together.

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

### Reviews stopped depending on enquiries (#29)

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

**#29 removed the enquiry queue from the admin side entirely** — the
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

> **Superseded by this round.** The admin list is back as **Customers**, and
> paged. The endpoint is bounded. `/my-trip` no longer amends an enquiry —
> contact details are all a traveller can change.

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

Found by review, roughly in priority order. §2 was closed this round; the
rest outlive it and are **still not fixed**.

### 1. The privacy policy — the false half is fixed, the business half is not

**The lie is gone.** `app/[locale]/privacy/page.tsx` used to say the site
"does not run a server-side database of visitor or customer information" and
that enquiry details are "not stored on, or transmitted through, a server or
database operated by this website". Both were flatly false, the site is sold
into four EU markets, and a "pending legal review" banner does not cure an
affirmative false statement. It has been rewritten to say what the code
actually does.

This was previously filed as needing Nandana before a line of it could be
written. That was half right. Retention, legal basis and the controller are
his; **describing what the code stores is not a business fact, it is a fact
about the code**, and leaving a falsehood up while waiting for him was the
worse of the two states.

What the page now says, each point checked against the code that does it:
the enquiry copy in `tourRequests` and its revisions, the document snapshot
and the download log, the newsletter address, the review invitation and the
review itself, the traveller account and its fortnight-long cookie, the
`localStorage` draft, and the bucket counters that store no address. It
names Vercel, Firebase, Cloudinary, OpenStreetMap and OSRM, and it states —
from `docs/llm.md` — that no customer data has ever been sent to a model.
Two claims were verified in a browser rather than asserted: a plain visit
sets no cookie at all, and there is no analytics code anywhere in the repo.

**What is still open** is business fact, and the page says so in its own
section rather than inventing it: who is formally responsible and where to
write, how long each thing is kept, the legal basis, and how an EU or UK
visitor exercises their rights. Nandana and a lawyer. Until then the page
points them at the Contact page and promises the request will be honoured —
somebody has to actually honour it.

The page is still English-only, and still says so.

### 2. ~~The enquiry endpoint is unauthenticated and unbounded~~ — closed

`requestPayloadSchema` bounds every free-text field and every array, and the
**Customers** section watches the collection again. It is still
unauthenticated, which is by design — a traveller must be able to send an
enquiry without an account — but a single request can no longer push a
megabyte into Firestore.

The other half — nothing stopped a *loop* of bounded requests — is closed too:

- **A honeypot**, the newsletter's pattern exactly. `company` is hidden from
  people by CSS and out of the tab order; a bot that fills every input gives
  itself away. It is answered before the payload is even validated, so a bot
  cannot learn from the reply and costs nothing to turn away, and it is kept
  out of `payload` so it never reaches a stored enquiry.
- **A rate limit**, `lib/tourRequests/rateLimit.ts`: eight writes per caller
  per hour, counted in Firestore because an in-process counter does not
  survive a cold start (that counter was removed from this codebase once
  already). Callers are hashed into a fixed 4096 buckets, so the collection
  cannot grow however long it is abused, and no address or hash is stored.
  Every failure path allows the write: the traveller is on their way to
  WhatsApp regardless, and a counter that cannot be read must not be the
  reason an enquiry is lost.

Verified against a running production build: a filled honeypot answers
`{ saved: false }` and never reaches validation, an empty one goes straight
through, and the wizard sends the field. **The limiter's Firestore path has
not run against the real project** — it was proved against a stub, and it is
unreachable in a deployment with no Firebase variables.

The original note follows, because the reasoning is still worth having.

#### The original note

`POST /api/custom-tour/requests` has no auth, no rate limit and no honeypot,
and `requestPayloadSchema` puts no `.max()` on `name`, `requirements` or
`accommodationNotes`. One request can push roughly a megabyte into
Firestore, and nothing stops a loop. The newsletter route already has the
honeypot pattern to copy. This is the cheapest real fix on the list.

Since the admin enquiry queue was removed, nothing in the panel reads what
this endpoint writes either — junk would accumulate in `tourRequests`
unnoticed, and only `/my-trip/<reference>` would ever look at it.

### 3. Smaller items

- ~~**No Content-Security-Policy.**~~ There is one now, sent
  **report-only**: it reports what it would refuse and refuses nothing. That
  is the remaining work, not a hedge — the two flows most likely to trip it
  (admin Google sign-in, the traveller email link) need the real Firebase
  project. Everything reachable without it was walked with the policy
  *enforcing* and came back clean: every public page, both 404s, the wizard
  end to end, and the PDF. One expected report: Zod's `Function("")` probe,
  which it wraps in a `try`/`catch` for exactly this and falls back from.
  `docs/security-headers.md` has what is proved, what is not, and the four
  steps to turn it on.
- ~~**`app/sitemap.ts` sends `lastModified: new Date()`**~~ — the field is
  gone. It claimed every URL had changed the moment a crawler asked, which is
  never true and which search engines discount. Nothing carries a real
  timestamp, and a build date would be the same wrong answer, so an omitted
  field — read as "unknown" — is the honest one.
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
- ~~**`lib/ai/translateItinerary.ts` pins `gemini-3.6-flash`.**~~ It is now
  `GOOGLE_AI_MODEL`, defaulting to that id, and the admin panel's **AI**
  section has a button that proves whether it still resolves. The id itself
  has still never been run against a real key — press the button.

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

### 8. Firestore drops documents that lack the field you order by

The admin itinerary list is alphabetical rather than featured-first, and not
by preference. `orderBy("featured")` **excludes every document that has no
`featured`** — which is every itinerary written before the field existed. The
list would have silently lost most of its rows, and looked like a data-loss
bug rather than a query one.

`head` is on every record, so the list sorts by that and shows `Featured` as a
label. The wizard still offers them featured-first: that read is the whole
(small) collection, sorted in memory, where the rule does not apply.

**Rule:** before ordering by a field in Firestore, ask whether every document
has it. Optional fields and `orderBy` do not mix.

### 9. Playwright's `has-text` is a case-insensitive substring match

A script driving the custom-tour wizard used
`:has-text("Continue"), :has-text("Review")` to find the forward button. The
`"Review"` half matched the progress rail's disabled **"07 REVIEW"** step, so
the run timed out clicking a button that can never be enabled — and read
exactly like the wizard being broken.

This is *Failed attempts* §4 again, in a new costume: the site's duplicated
responsive controls punish loose selectors. `getByRole("button", { name, exact: true })`
does not have the problem.

**Rule:** exact role-and-name selectors, and filter by visibility, on this
site especially.

### 10. §6 bites again — and the way that actually works

Killing the dev server with a command whose own text contains `next-server`
kills the shell running it, because the pattern matches the shell's `cmdline`.
That is §6, already written down, and it still happened.

What works is finding the process by what is **listening**, not by its name:

```sh
port_hex=$(printf '%04X' 3000)
inode=$(awk -v p=":$port_hex" 'NR>1 && $2 ~ p"$" && $4=="0A" {print $10; exit}' /proc/net/tcp)
# then find the pid holding that socket inode in /proc/*/fd, skipping your own
```

**Rule:** never pattern-match a process by a string your own command contains.

---

## Next steps

### 1. Prove this branch against the real project

Firebase is connected, so the question is no longer whether the code paths
*can* run — it is whether they do. Nothing on this branch that touches
Firestore or Firebase Auth has been run against the project; `PLAN.md` →
*What is still not proven* lists it in priority order. The short version:

0. Read `docs/security-headers.md` first if you are also promoting the CSP:
   steps 3 and 4 below are two of the flows its reports are waiting on, so
   doing them with devtools open costs nothing extra and closes that item.
1. `firebase deploy --only firestore:indexes` — three composites, and two
   features fail outright without them.
2. Set `SUPER_ADMIN_EMAIL` before anyone needs to edit the access list.
3. Open a real enquiry in **Customers** and press *Download PDF*. That is the
   feature the round was built for and the one most worth seeing work.
4. Test `discardProbeAccount` deliberately, with a throwaway Google account:
   confirm it is refused **and** that the account is gone. This is the one
   piece where a bug deletes something real.
5. Press *Test the connection* in **AI**. `gemini-3.6-flash` has never run
   against a real key.
6. Send two or three enquiries in a row and confirm each lands in
   **Customers**. The enquiry rate limiter writes to Firestore and has only
   ever run against a stub; eight per hour is well above anything a person
   does, so a real traveller should never meet it.

`scripts/grant-admin.mjs` remains for bootstrapping a deployment with no
super admin configured; it doubles as the credential test, using the same
service account and touching both Auth and Firestore.

### 2. Decisions outstanding

- ~~**Analytics provider.**~~ **Decided: none, for now.** Nothing is wired up
  and nothing is to be. Two things follow, and both are already true rather
  than planned: there is **no cookie banner to build**, because the site sets
  no cookie at all until somebody signs in, and the privacy page can say
  plainly that the site runs no analytics — which it now does, and which was
  checked against the repository rather than assumed. Search Console still
  gives search traffic; what is given up is on-site behaviour. Reopening this
  means picking a provider first: a cookieless one (Plausible, Vercel
  Analytics) stays banner-free, GA4 does not and brings the banner, the
  pre-consent suppression and a cookie section with it.
- **Remaining vulnerabilities.** Still open, with a standing recommendation to
  leave them. 1 high (`js-yaml`, build-time only) and 6 moderate, all
  transitive through `firebase-admin`'s storage chain. `firebase-admin` is
  what pins Node 22 and the `jose` override, both of which have taken the site
  down before, so the fix currently carries more risk than the bugs. This is
  the one item here that needs no work unless somebody disagrees.

### 3. Fixes identified but not made

The items under *Known issues* above. §2 is fully closed now — bounded,
honeypotted and rate-limited — and both codeable items under §3 are done: the
sitemap no longer lies about `lastModified`, and there is a Content Security
Policy waiting in report-only mode.

What is left there is not code:

- **Promote the CSP** once the reports are clean, which needs somebody to sign
  in to the admin panel, upload a photograph and follow a traveller email link
  with devtools open. `docs/security-headers.md`, *Turning it on*.
- **§1, the privacy policy** — the false statements are gone and what the
  site stores is described accurately. The four business questions left on
  the page need Nandana and a lawyer.

### 4. Content still required before launch

- **FAQ** — "what is included in the price" and "how and when do I pay" carry
  `contentRequired: true` in `content/<locale>/faq.json` and do not render.
  Only Nandana can answer them.
- **Privacy policy** — no longer wrong, but not finished. The description of
  what the site stores is accurate now; the four business questions at the
  bottom of the page (controller, retention, legal basis, how to exercise
  rights) are still blank and marked as such. Only Nandana, with legal
  advice, can answer them. A localized version in the other four languages
  is still pending too.
- **Search Console and Bing verification codes** — `docs/seo.md` has the
  step-by-step.
- **Native-speaker review** of the Dutch, Spanish, Danish and Finnish copy,
  including the `search`, `faq`, `newsletter` and `gallery` strings. The
  `gallery` ones are the newest and the least reviewed.
