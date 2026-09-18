# Firebase integration

Everything you need to connect this site to a real Firebase project, verify it,
and keep it running.

> **Status: not yet connected.** All of the code described here is written and
> merged, but no Firebase project exists yet, so none of it has ever run
> against one. This document is the instructions for doing that, not a record
> of it having been done.

**Never commit real secrets.** `.env` is gitignored; `.env.example` is the only
env file in the repository and holds names and comments, never values.

> **This project requires Node 22.** `firebase-admin@14` declares
> `engines: { "node": ">=22" }`, and running below it takes the **whole site**
> down, not just the Firebase features — see section 0.

---

## 0. Node 22 is not optional

`package.json` declares `engines: { "node": "22.x" }`. Setting the Node version
in the hosting project's settings is a separate step, and **that field alone
does not rebuild what is already deployed.**

This is not housekeeping. On Node 20 every page of the deployed site returned
500, because `lib/firebase/admin.ts` statically imports `firebase-admin/auth`,
`lib/reviews/store.ts` imports that, and the home page renders approved
reviews — so the crash happened while building the module graph for *every*
request. The cause was `jwks-rsa` (a `firebase-admin` dependency) doing
`require('jose')` against an ESM-only jose, which only works from Node 22.12.

`overrides.jwks-rsa.jose: ^5.10.0` in `package.json` removes the need for that
`require(ESM)` at all. Both fixes are kept, and **neither should be removed
without the other.**

The trap: the build passes on Node 20, and it cannot be reproduced on a
developer machine already running 22 or newer. It fails only at request time,
in production.

**Do not regenerate `package-lock.json` wholesale to tidy the override away.**
The edit was kept narrow deliberately; a full regeneration bumped 83 unrelated
packages the last time it was tried.

---

## 1. How Firebase is used here

Three services, each with a specific job:

| Service | What it holds |
|---|---|
| **Firestore** | Itineraries, tour enquiries, review invites, reviews, the staff allowlist |
| **Authentication** | Staff sign-in (Google) and traveller sign-in (email link) |
| **Storage** | Itinerary photographs and review photographs |

### The one architectural rule

**Every Firestore read and write goes through a Next.js route handler using the
Admin SDK. The browser SDK never touches Firestore.**

`firestore.rules` therefore denies all client access outright. That is
deliberate: with no legitimate client access to allow, there are no
per-collection rules to get subtly wrong, and one over-broad `allow read` on
`tourRequests` would expose every traveller's name, email and phone number.
Authorisation lives in the route handlers, where it can be read in one place.

There is no `storage.rules`: Firebase holds no files. Photographs go direct
from the browser to Cloudinary instead, under a signature this server issues —
see [`cloudinary.md`](cloudinary.md).

If you ever need a client read, add a route handler. Do not open the rules.

### Nothing throws when Firebase is absent

`lib/firebase/admin.ts` and `lib/firebase/client.ts` return `null` rather than
throwing when the environment is incomplete. The site builds and serves; the
Firebase-backed features report themselves unavailable. This is why merging
phases 1–5 changed nothing observable, and it is why a deployment that loses
its Firebase variables degrades instead of going down.

---

## 2. Environment variables

Names only. Fill the values in `.env` locally and in the Vercel dashboard.
`.env.example` is the authoritative list and carries per-variable comments.

### Admin panel — nothing to set

Admin sign-in is Firebase Authentication only. There is no shared password and
no `ADMIN_*` variable: access is the `admin` custom claim plus an entry in the
`staff` collection, both handled by `scripts/grant-admin.mjs` (§5).

This means **the Firebase variables below are what make the panel reachable at
all.** A deployment without them shows the sign-in screen with an explanation
and no way in, which is the intended behaviour — there is deliberately no
weaker path that activates when the strong one is unavailable.

If `ADMIN_EMAIL`, `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` are still set in
Vercel from before, delete them. Nothing reads them, and a live secret nobody
uses is a secret nobody rotates.

### Firebase, server side (Admin SDK) — from the service account key

| Variable | Notes |
|---|---|
| `FIREBASE_PROJECT_ID` | Required |
| `FIREBASE_CLIENT_EMAIL` | Required |
| `FIREBASE_PRIVATE_KEY` | Required. **A genuine secret** — full administrative access, bypasses all security rules |

`isFirebaseConfigured()` checks all three. There is no storage bucket to set:
photographs live on Cloudinary — see [`cloudinary.md`](cloudinary.md).

### Firebase, browser side — from the web app config

| Variable |
|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` |

These are public by design. A web API key identifies the project; it does not
authorise anything. Security comes from Auth and the rules files.

### Everything else

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute origin, for canonical URLs, sitemap, robots, JSON-LD |
| `GOOGLE_AI_API_KEY` | Gemini, for the admin translation panel. Optional — without it translation returns 503 and nothing else is affected |

### The private key is the thing that goes wrong

A PEM block survives an environment variable as **one line with literal `\n`**.
Vercel and `.env` files disagree about whether the surrounding double quotes
are kept, so `lib/firebase/admin.ts` strips them if present and expands `\n`
back to real newlines. It fails with an opaque error when this is wrong. See
Troubleshooting.

---

## 3. Creating the Firebase project

1. **Create the project** at <https://console.firebase.google.com>.

2. **Firestore** — create the database in **native mode**. Pick a region close
   to your users and note that *the region cannot be changed later*.

3. **Authentication** — enable **two** providers:
   - **Google** — staff sign-in to the admin panel.
   - **Email link (passwordless sign-in)** — traveller sign-in at `/my-trip`.
     This is a separate provider from "Email/Password"; enable the email-link
     option specifically.

   Then add every domain the site is served from to
   **Authentication → Settings → Authorised domains**: `localhost`, your
   Vercel preview domain, and the production domain. Emailed sign-in links are
   rejected from any domain not on this list.

4. **Service account key** — Project settings → Service accounts → Generate new
   private key. This downloads a JSON file. Take `project_id`, `client_email`
   and `private_key` from it into the three server variables. **Do not commit
   the JSON file.**

5. **Web app config** — Project settings → Your apps → Web app. Copy the six
   `NEXT_PUBLIC_FIREBASE_*` values.

### Deploy the rules and indexes

`firebase.json` already points at `firestore.rules` and
`firestore.indexes.json`.

```bash
npm i -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore,storage
```

`--only firestore` deploys the rules **and** the indexes. If you deploy only
the rules, listing reviews by status fails with a console link asking you to
create the index by hand.

---

## 4. Verifying the connection

`/api/admin/firebase-status` exists precisely because setting the variables
feels like finishing and usually is not. It performs one real Firestore read —
one document from the `staff` collection — so a wrong project id, a mangled
private key or a service account without permissions surfaces here rather than
deep inside a later feature.

It is admin-gated: naming which variables are missing is a small gift to
anyone probing the deployment.

It is therefore not the *first* thing you can check, because signing in
requires a working Firebase project in the first place. Granting yourself
access (§5) comes first and is itself a credential test:
`scripts/grant-admin.mjs` uses the same service account and touches both Auth
and Firestore, so if it succeeds they are correct. Then:

1. Sign in at `/en/admin` with Google.
2. Open `/api/admin/firebase-status`.

Expected:

```json
{ "configured": true, "reachable": true, "missing": [] }
```

Other answers:

| Response | Meaning |
|---|---|
| `401` | Not signed in as an admin |
| `configured: false` with `missing: [...]` | Those variables are not set |
| `configured: true, reachable: false` + `error`, HTTP 503 | Variables are set but the round trip failed — read the `error` |

**Do not bypass this check.** Everything downstream assumes it passes.

---

## 5. Granting staff access

Sign-in requires **both** conditions, and neither is sufficient alone:

- an entry in the `staff` Firestore collection (an allowlist entry alone is
  trivially added by anyone who reaches Firestore), **and**
- an `admin: true` custom claim on the Firebase account (a claim alone could
  outlive someone's employment).

The claim is set by a script, never over HTTP. A route that grants
administrative access is a route that can be reached, guessed at, or left
exposed by a later refactor.

1. Have the person open `/en/admin` and click **Continue with Google** once.
   **It will be refused — that is expected.** The attempt creates their
   Firebase account, which is what the next step needs.

2. Grant them access:

   ```bash
   node --env-file=.env scripts/grant-admin.mjs someone@example.com
   ```

3. They must **sign out and back in**. A custom claim only reaches a fresh
   token.

Revoke with the same command plus `--revoke`. That clears the claim, revokes
refresh tokens and deletes the `staff` entry. Because sessions are verified
with `checkRevoked: true`, removal takes effect on their **next request**
rather than up to eight hours later.

### There is no second way in

The shared-password path that used to sit behind this one has been removed:
`lib/admin/session.ts`, `lib/admin/rateLimit.ts`, the password branch in
`app/api/admin/session/route.ts` and the `PasswordSignIn` form are all gone.

So if Google sign-in cannot work — wrong service-account key, staff entry
missing, Firebase unreachable — the fix is to repair that, not to reach for
another door. `/api/admin/firebase-status` (§4) is the first thing to check,
and it is admin-gated, so a completely broken deployment is diagnosed from the
Vercel logs: the refusal reason is written there by
`app/api/admin/session/route.ts`.

---

## 6. Firestore collections

Named once in `lib/firebase/collections.ts`, so a typo is a compile error
rather than a silently-created second collection.

### `itineraries`

One document per itinerary, keyed by its `id`. One document per record rather
than a single whole-file archive is what removes the write race: a
read-modify-write over one file with no locking meant two admins saving at
once silently overwrote each other.

Shape: `lib/itineraries/types.ts` (`itineraryRecordSchema`). A malformed
document is logged and skipped rather than failing the whole list — returning
fewer itineraries is bad, returning none is worse.

### `tourRequests`

Custom tour enquiries, keyed by a short human `reference` like `NW-7K3QD`.

Fields: `reference`, `email` (lowercased — this is what ownership is checked
against), `locale`, `status`, `payload`, `createdAt`, `updatedAt`, `revision`.

The wizard's answers are one opaque `payload` map rather than columns,
deliberately: the wizard changes often, and each change would otherwise mean a
schema migration over live enquiry data.

**`revisions` subcollection** — the previous version is copied here inside a
transaction before an amendment lands, because the team may already have quoted
against it. The email is deliberately **not** updatable by a revision.

**The reference is not a credential.** Five characters from a 28-letter
alphabet, printed on the WhatsApp message and readable over the phone, so
neighbouring codes are guessable. It says *which* trip; the email-link sign-in
says *who*.

### `reviewInvites`

One-time, expiring links. Fields: `token` (64 hex characters from
`crypto.randomUUID`), `label`, `locale`, `createdAt`, `expiresAt`, `usedAt`,
`invitedBy`. Lifetime **60 days**.

**The link is the credential.** It is tied to nobody: a staff member makes one
from the admin panel, with a label for their own reference, and pastes it into
whatever conversation they are already having. Nothing is emailed and no
address is matched, because plenty of travellers never filled the enquiry form
in and their reviews are worth as much. Redemption marks the invite used
*inside a transaction*, so two people opening the same link cannot both submit.

`reference`, `email` and `name` are nullable and only ever set on links made
before invitations stopped coming from the enquiry queue; the panel still shows
them so an old link can be placed.

### `reviews`

Fields: `id`, `reference`, `author`, `country`, `rating` (whole stars, 1–5),
`quote`, `photos` (`{ url, path }`, max 4), `locale`, `status`, `createdAt`,
`moderatedAt`, `moderatedBy`.

Everything lands as `pending`; nothing is public until a staff member approves
it. Because every review traces back to a link a staff member made by hand,
spam is structurally impossible — moderation is a quality gate, not a defence.

Approving, unpublishing and deleting are all in the panel: unpublishing returns
a review to the queue with its photographs, deleting removes it and them for
good.

`path` is stored alongside `url` so a rejected review's photographs can
actually be deleted. **Rejecting deletes them**: files stay publicly readable
at their URLs for as long as they exist.

Approved reviews merge into the home page testimonials **in the language they
were written in** — translating somebody's own words about their holiday is not
ours to do. `AggregateRating` JSON-LD is emitted only from three reviews
upward.

### `staff`

The admin allowlist, keyed by lowercased email. Written only by
`scripts/grant-admin.mjs`.

### Indexes

`firestore.indexes.json` declares one composite index:

- `reviews` on `status ASC, createdAt DESC` — the moderation queue

---

## 7. Authentication

### Staff — Google

`components/admin/AdminSignIn.tsx` signs in with a Google popup, gets an ID
token and POSTs it. The server verifies it, requires the `staff` entry **and**
the `admin` claim, then mints a Firebase session cookie.

- Cookie: `nwsl_admin_session`, httpOnly, secure, `sameSite: "strict"`.
  Nothing outside this site should ever navigate someone into an authenticated
  admin action, and strict costs nothing for a panel reached by typing its
  address.
- Verified with `checkRevoked: true` on every request.
- Sign-out **revokes refresh tokens before clearing the cookie** — clearing it
  only stops *this* browser presenting it, and a copy taken elsewhere would
  keep working.
- The refusal reason is logged server-side but not returned: whether an address
  is on the staff list is not something an unauthenticated stranger should
  learn.

The admin page is a `force-dynamic` server component calling `isAdminSession()`,
so the panel's markup is never sent to a stranger. **There is no middleware**,
and this is not an oversight: `proxy.ts` runs on the edge runtime where
`firebase-admin` cannot run, so a middleware check could only test whether a
cookie *exists* — which proves nothing. Do not "restore" it.

> **`requireAdmin` is async.** Every call site must `await` it. A forgotten
> `await` returns a Promise, which is truthy, which admits everyone. This is
> the one genuinely dangerous mistake available in this code. The signed-out
> test in the checklist exists to catch it.

### Travellers — email link

`components/my-trip/TravellerAccess.tsx` sends a sign-in link and exchanges it
at `/api/traveller/session`.

- Cookie: `nwsl_traveller`, 14 days, `sameSite: "lax"` — **not** strict.
  Travellers arrive by clicking a link in their email, and a strict cookie
  would not be sent on that first cross-site navigation: they would land
  signed out having just signed in.
- **No custom claim.** Proving you hold an email address must never be a step
  towards the admin panel.

Requires the email-link provider enabled and the domain on the authorised list.

---

## 8. Photographs

Firebase holds no files. Every uploaded image — itinerary photographs and
review photographs alike — lives on **Cloudinary**, and
[`cloudinary.md`](cloudinary.md) is the whole of that story: the three
environment variables, how the admin form gets a signature, and why review
photos are uploaded by the server while itinerary photos are not.

There is no `storage.rules` and no bucket in `firebase.json`; Firebase is
accounts and documents only.

> **If images were uploaded before the switch**, their records hold absolute
> `firebasestorage.googleapis.com` URLs. Those still render — the host is
> still listed in `next.config.ts` `remotePatterns` for exactly that reason —
> but nothing writes there any more, and rejecting such a review can no
> longer delete its files. See [`cloudinary.md`](cloudinary.md) § *Images
> from before the switch*.

## 9. Vercel

Set **every** variable from section 2 in Project → Settings → Environment
Variables, for Production (and Preview, if previews should work).

`FIREBASE_PRIVATE_KEY` is the one that goes wrong. Paste the PEM as a single
line with literal `\n` sequences. If you paste a real multi-line block, or if
the quotes are handled differently than you expect, the app fails with an
opaque credential error — `lib/firebase/admin.ts` handles both quoted and
unquoted forms, but not a value whose newlines were lost entirely.

Redeploy after changing variables; they are read at build and boot.

Then verify in production, in this order:

1. `/api/admin/firebase-status` → `{ "configured": true, "reachable": true }`
2. Sign in with Google as a granted staff member
3. Save an itinerary with a photograph; confirm it loads from Storage
4. Send a test enquiry; confirm a `tourRequests` document appears
5. Open `/my-trip/<reference>`, sign in with the emailed link, amend it
6. Send yourself a review invite, submit a review with photographs, approve it

Add the production domain to Firebase's authorised domains, or the emailed
links will be rejected.

---

## 10. Testing checklist

Run through this after connecting, and again after touching auth.

**Connection**
- [ ] `/api/admin/firebase-status` returns `configured: true, reachable: true`
- [ ] Returns 401 when signed out

**Admin auth**
- [ ] Google sign-in refused before `grant-admin.mjs` has been run
- [ ] Accepted after granting, and after signing out and back in
- [ ] `/en/admin` signed out returns the sign-in form and **no panel markup**
      (grep the HTML for "Custom tour optimisation" and "Customers")
- [ ] **The awaited-`requireAdmin` test:** signed in, `DELETE
      /api/admin/itineraries` with no id returns 400 `missing_id`; after
      signing out the same call returns 401. Had an `await` been forgotten, the
      signed-out call would return 400 too
- [ ] `--revoke` locks the person out on their next request

**Itineraries**
- [ ] Create, edit, hide, delete from the panel
- [ ] Photographs upload to Storage, not inline (the size warning counts only
      inline images)
- [ ] Anonymous `GET /api/itineraries` omits hidden records; the admin list and
      JSON export include them
- [ ] The wizard shows visible itineraries in each locale

**Saved trips**
- [ ] Sending an enquiry writes a `tourRequests` document
- [ ] WhatsApp still opens even if the write fails
- [ ] Email-link sign-in reaches `/my-trip/<reference>`
- [ ] A reference belonging to someone else gives the same answer as one that
      does not exist
- [ ] Amending writes a `revisions` document and preserves the original payload

**Reviews**
- [ ] Link created from the panel's Review links section
- [ ] The link opens the form; **a used link is refused**
- [ ] An expired invite is refused
- [ ] More than 4 photos, or one over 3 MB, is refused with a reason
- [ ] Approving publishes on the home page in the review's own language
- [ ] Rejecting **actually deletes** the photographs from Storage
- [ ] `AggregateRating` appears only from three approved reviews upward

**Rules**
- [ ] A browser Firestore read is denied
- [ ] A browser Storage write to `reviews/` is denied
- [ ] A browser Storage write to `itineraries/` without the `admin` claim is
      denied

**Build**
- [ ] `npx tsc --noEmit`, `npx eslint .`, `npm run build` all clean

---

## 11. Troubleshooting

**`configured: false`** — the named variables are not set, or the process did
not reload. Restart `next dev`; redeploy on Vercel.

**`reachable: false` with a credential error** — almost always the private key.
It must be one line with literal `\n`. Check quickly:

```bash
node --env-file=.env -e "console.log(process.env.FIREBASE_PRIVATE_KEY.slice(0,40))"
```

You should see `-----BEGIN PRIVATE KEY-----\nMII…`. If you see real line breaks,
or no `\n` at all, that is the fault.

**`reachable: false` with a permission error** — the service account lacks
Firestore access, or Firestore was never created. Confirm the database exists
in native mode.

**Google sign-in refused for a real staff member** — they have not been granted,
or they have not signed out and back in since being granted. The claim only
reaches a fresh token.

**Emailed sign-in link rejected** — the email-link provider is not enabled
(separate from Google), or the domain is not on the authorised domains list.

**Images do not render** — the host is not in `next.config.ts`
`remotePatterns`. `next/image` refuses silently.

**Listing reviews fails with a console link** — the composite indexes were not
deployed. `firebase deploy --only firestore`.

**Photograph upload refused** — uploads are signed by
`/api/admin/cloudinary-signature`, which is admin-only. A 401 means the admin
session has lapsed; a 503 means the three `CLOUDINARY_*` variables are not
set on this deployment. `/api/admin/firebase-status` reports which.

**Every page returns 500 in production, with `ERR_REQUIRE_ESM` naming
`jwks-rsa` and `jose` in the runtime log** — the deployment is running below
Node 22. Set the Node version in the hosting project's settings and redeploy;
`engines` in `package.json` does not rebuild what is already out there. Check
that `overrides.jwks-rsa.jose` is still present too. See section 0.

**`next build` kills the dev server** — they contend over `.next`. Stop the dev
server first.

---

## 12. Cost and usage

The free Spark tier is generous and this site is small. Rough shape of the
usage:

- **Firestore reads** are the number to watch. Itineraries are read on every
  custom-tour page view. The 30-second poll that used to re-download the whole
  archive for every open tab is gone, replaced by a refetch on tab focus.
- **Writes** are tiny: one per enquiry, one per amendment, one per review.
- **Storage** holds itinerary photographs (a few hundred KB each after the
  phase 6 re-encode) and review photographs (max 4 × 3 MB per review).
- **Auth** is free at this scale. Note that email-link sign-in sends email
  through Firebase's own quota.

Upgrading to Blaze is only needed for outbound networking or higher quotas; set
a **budget alert** if you do. The one thing that could surprise you is an
unbounded Firestore read loop, so keep the caching decision in mind:
`GET /api/itineraries` is `force-dynamic` because the response varies by admin
cookie. Caching it with `revalidateTag` is worth doing eventually, but as its
own change with its own testing — a mistake there would serve one visitor's
view to another.

---

## 13. Backup and recovery

- **Itineraries** — the admin panel's JSON export is a complete backup. Take
  one before any migration or bulk import. Import-with-replace runs as one
  atomic batch and refuses outright above 500 operations rather than applying
  in halves.
- **Firestore as a whole** — use scheduled exports to a Cloud Storage bucket
  (`gcloud firestore export`). Requires Blaze.
- **Storage** — photographs are the one thing with no second copy once the
  originals are off the admin's machine. Include the bucket in whatever backup
  regime you use.
- **Recovery** — a lost Firestore is recoverable from a JSON export via the
  admin panel's import. Photographs are not: they live in the Cloudinary
  account and nothing in this repository backs them up.
- **Rules and indexes** are versioned in git (`firestore.rules`,
  `firestore.indexes.json`) and redeployed with
  `firebase deploy --only firestore`.

---

## Reference

| File | What |
|---|---|
| `lib/firebase/admin.ts` | Admin SDK singleton — the only door to Firestore |
| `lib/firebase/client.ts` | Browser SDK — sign-in and Storage uploads only |
| `lib/firebase/collections.ts` | Collection and Storage path names |
| `lib/admin/auth.ts` | The single authorisation point |
| `lib/itineraries/store.ts` | Itineraries in Firestore — the only store |
| `lib/tourRequests/store.ts` | Enquiries: create, get, revise |
| `lib/reviews/store.ts` | Invites, photo limits, redemption, moderation |
| `firestore.rules` | Security rules |
| `lib/cloudinary/` | Photograph upload and deletion |
| `firestore.indexes.json` | Composite indexes |
| `scripts/grant-admin.mjs` | Grant and revoke staff access |
| `app/api/admin/firebase-status/route.ts` | The connectivity probe |
| `docs/FIREBASE_SETUP_CHECKLIST.md` | The same steps, as a checklist |
