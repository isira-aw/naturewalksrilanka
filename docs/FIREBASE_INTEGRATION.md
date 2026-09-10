# Firebase integration

Everything you need to connect this site to a real Firebase project, verify it,
and keep it running.

> **Status: not yet connected.** All of the code described here is written and
> merged, but no Firebase project exists yet, so none of it has ever run
> against one. This document is the instructions for doing that, not a record
> of it having been done. See "Current state" in `handoff.md`.

**Never commit real secrets.** `.env` is gitignored; `.env.example` is the only
env file in the repository and holds names and comments, never values.

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

`storage.rules` is different — it carries real logic, because uploads genuinely
do go direct from the browser.

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

### Admin panel — all three required

| Variable | Notes |
|---|---|
| `ADMIN_EMAIL` | The legacy shared-password account |
| `ADMIN_PASSWORD` | Long and random. Do not reuse one from anywhere else |
| `ADMIN_SESSION_SECRET` | Signs the admin session cookie |

**There are no fallback values.** If any of the three is missing, admin sign-in
fails closed and the panel cannot be entered at all — this is the first thing
to set, before any Firebase work, because you need the panel to check the
Firebase connection.

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Anyone who learns `ADMIN_SESSION_SECRET` can forge a valid session **without
the password**. Use a fresh random value per environment.

### Firebase, server side (Admin SDK) — from the service account key

| Variable | Notes |
|---|---|
| `FIREBASE_PROJECT_ID` | Required |
| `FIREBASE_CLIENT_EMAIL` | Required |
| `FIREBASE_PRIVATE_KEY` | Required. **A genuine secret** — full administrative access, bypasses all security rules |
| `FIREBASE_STORAGE_BUCKET` | e.g. `your-project.firebasestorage.app` |

`isFirebaseConfigured()` checks the first three. `FIREBASE_STORAGE_BUCKET` is
read separately when the app is initialised, so a missing bucket surfaces on
first upload rather than at the status check — set it at the same time.

### Firebase, browser side — from the web app config

| Variable |
|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` |

These are public by design. A web API key identifies the project; it does not
authorise anything. Security comes from Auth and the rules files.

### Everything else

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute origin, for canonical URLs, sitemap, robots, JSON-LD |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob. Read implicitly by `@vercel/blob`, not via `process.env` in our code. Needed until the itinerary migration is done and the blob path is removed |
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

4. **Storage** — create the default bucket. Note its name for
   `FIREBASE_STORAGE_BUCKET`; newer projects use `*.firebasestorage.app`,
   older ones `*.appspot.com`. Both host patterns are already allowed in
   `next.config.ts`.

5. **Service account key** — Project settings → Service accounts → Generate new
   private key. This downloads a JSON file. Take `project_id`, `client_email`
   and `private_key` from it into the three server variables. **Do not commit
   the JSON file.**

6. **Web app config** — Project settings → Your apps → Web app. Copy the six
   `NEXT_PUBLIC_FIREBASE_*` values.

### Deploy the rules and indexes

`firebase.json` already points at `firestore.rules`, `storage.rules` and
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

1. Sign in at `/en/admin`. While Firebase is unconfigured this is the shared
   password path, which is exactly why that path still exists.
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

### Removing the legacy password path

Once at least one staff account signs in with Google successfully, delete it:

- the legacy branch in `app/api/admin/session/route.ts`
- `PasswordSignIn` in `components/admin/AdminSignIn.tsx`
- `lib/admin/session.ts` and `lib/admin/rateLimit.ts`
- the three `ADMIN_*` variables, locally and in Vercel

Until then the shared password still works **whenever Firebase is
unconfigured**, which includes any deployment that loses its Firebase
variables. Note the ordering in `requireAdmin`: when Firebase *is* configured
the legacy cookie is no longer accepted, so this is a fallback for a broken
deployment, not a permanent second door.

---

## 6. Firestore collections

Named once in `lib/firebase/collections.ts`, so a typo is a compile error
rather than a silently-created second collection.

### `itineraries`

One document per itinerary, keyed by its `id`. Replaces the single Vercel Blob
archive, which did a whole-file read-modify-write with no locking — two admins
saving at once silently overwrote each other.

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
`crypto.randomUUID`), `reference`, `email`, `name`, `locale`, `createdAt`,
`expiresAt`, `usedAt`, `invitedBy`. Lifetime **60 days**.

**The link is the credential.** It carries no information about the enquiry.
Redemption marks the invite used *inside a transaction*, so two people opening
the same link cannot both submit.

Invites are created from the enquiry's own stored name and email, never from
anything the caller supplies — otherwise the endpoint would be a way for a
compromised admin session to send review links to arbitrary addresses.

### `reviews`

Fields: `id`, `reference`, `author`, `country`, `rating` (whole stars, 1–5),
`quote`, `photos` (`{ url, path }`, max 4), `locale`, `status`, `createdAt`,
`moderatedAt`, `moderatedBy`.

Everything lands as `pending`; nothing is public until a staff member approves
it. Because every review traces back to an invite tied to a real enquiry, spam
is structurally impossible — moderation is a quality gate, not a defence.

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

`firestore.indexes.json` declares two composite indexes:

- `reviews` on `status ASC, createdAt DESC` — the moderation queue
- `reviewInvites` on `reference ASC`

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

## 8. Storage

| Path | Read | Write |
|---|---|---|
| `itineraries/{itineraryId}/{fileName}` | public | signed-in `admin` claim, image, < 8 MB |
| `reviews/{reviewId}/{fileName}` | public | **denied** — server-side only |
| anything else | denied | denied |

**Itinerary images** upload direct from the browser
(`lib/itineraries/imageUpload.ts`), falling back to inline base64 when there is
no signed-in Firebase user — because `storage.rules` requires the `admin` claim
and the legacy password path does not produce one. That fallback disappears
once every admin signs in with Google.

Uploads get a permanent **download-token** URL, not a signed one: a signed URL
would expire and quietly break the page weeks later.

**Review photographs go through the server**, not the browser. The original
plan had rules enforce the limits; they cannot. Rules cannot see the decoded
size of a base64 payload, and there is no signed-in account to attribute a
traveller's upload to. So `lib/reviews/store.ts` checks the count (max 4), the
decoded byte length (max 3 MB each) and the content type against an allowlist.
The client-side resize is a courtesy, not a control.

`next.config.ts` already lists both `firebasestorage.googleapis.com` and
`*.firebasestorage.app` in `remotePatterns`. Without them `next/image` refuses
the URLs — silently, from the page's point of view.

---

## 9. Migrating the itineraries

`lib/itineraries/repository.ts` is a facade: Firestore when configured, the old
blob archive when not. So the migration does not have to be atomic across a
deploy.

**Back up first.** Take a JSON export from the admin panel — that is the
backup.

```bash
# 1. Dry run. This is the default; nothing is written.
node --env-file=.env scripts/migrate-itineraries.mjs

# 2. Read the counts — records, images, megabytes of base64. Then:
node --env-file=.env scripts/migrate-itineraries.mjs --commit
```

The script:

- **never deletes the blob archive**;
- is **safe to re-run** — images that are already https URLs are left alone, so
  an interrupted run can simply be repeated;
- writes each record with `.doc(record.id).set(...)`, so re-running updates in
  place rather than **creating duplicates**;
- generates a blur placeholder for each image it uploads.

Afterwards verify:

- the admin list shows every itinerary, including hidden ones;
- the custom-tour page shows the visible ones;
- photographs load from `firebasestorage.googleapis.com`;
- translations survived.

**Only once all of that is right**, delete the `itineraries/archive.json` blob
by hand, remove `lib/itineraries/blobArchive.ts` and its branch in
`repository.ts`, and drop `@vercel/blob`.

If migration has already run, verify rather than repeat — check the document
count in the Firestore console against the record count in your export.

---

## 10. Vercel

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

## 11. Testing checklist

Run through this after connecting, and again after touching auth.

**Connection**
- [ ] `/api/admin/firebase-status` returns `configured: true, reachable: true`
- [ ] Returns 401 when signed out

**Admin auth**
- [ ] Google sign-in refused before `grant-admin.mjs` has been run
- [ ] Accepted after granting, and after signing out and back in
- [ ] `/en/admin` signed out returns the sign-in form and **no panel markup**
      (grep the HTML for "Custom tour optimisation" and "Data and migration")
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
- [ ] Invite created from the enquiry queue
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

## 12. Troubleshooting

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

**Itinerary images still inline** — expected while the legacy password path is
in use; there is no signed-in Firebase account to attribute the upload to. Sign
in with Google.

**`next build` kills the dev server** — they contend over `.next`. Stop the dev
server first.

---

## 13. Cost and usage

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

## 14. Backup and recovery

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
  admin panel's import. A lost bucket is not recoverable from anything in this
  repository.
- **Rules and indexes** are versioned in git (`firestore.rules`,
  `storage.rules`, `firestore.indexes.json`) and redeployed with
  `firebase deploy --only firestore,storage`.

---

## Reference

| File | What |
|---|---|
| `lib/firebase/admin.ts` | Admin SDK singleton — the only door to Firestore |
| `lib/firebase/client.ts` | Browser SDK — sign-in and Storage uploads only |
| `lib/firebase/collections.ts` | Collection and Storage path names |
| `lib/admin/auth.ts` | The single authorisation point |
| `lib/itineraries/repository.ts` | Firestore-or-blob facade |
| `lib/tourRequests/store.ts` | Enquiries: create, get, revise, list |
| `lib/reviews/store.ts` | Invites, photo limits, redemption, moderation |
| `firestore.rules` / `storage.rules` | Security rules |
| `firestore.indexes.json` | Composite indexes |
| `scripts/grant-admin.mjs` | Grant and revoke staff access |
| `scripts/migrate-itineraries.mjs` | Blob → Firestore migration |
| `app/api/admin/firebase-status/route.ts` | The connectivity probe |
| `docs/FIREBASE_SETUP_CHECKLIST.md` | The same steps, as a checklist |
| `handoff.md` | Why each decision was made, and what is unproven |
