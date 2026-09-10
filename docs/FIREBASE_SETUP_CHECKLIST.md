# Firebase setup checklist

The steps from `docs/FIREBASE_INTEGRATION.md`, in order, as a list to tick off.
Read that document for the reasoning behind any step. **Never commit real
secrets.**

Do these in order. Each one depends on the ones above it.

## 1. Admin panel — do this first

Nobody can reach the admin panel until this is done, and you need the panel to
check the Firebase connection.

- [ ] Generate a session secret:
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` in `.env`
- [ ] Set the same three in Vercel
- [ ] Sign in at `/en/admin` with the shared password

## 2. Create the Firebase project

- [ ] Create the project in the Firebase console
- [ ] **Firestore** — create in native mode (the region cannot be changed later)
- [ ] **Authentication → Google** — enable
- [ ] **Authentication → Email link (passwordless)** — enable (separate from
      Google, and from Email/Password)
- [ ] **Authentication → Settings → Authorised domains** — add `localhost`, the
      Vercel preview domain and the production domain
- [ ] **Storage** — create the default bucket, note its name
- [ ] **Service account key** — Project settings → Service accounts → Generate
      new private key. Do not commit the JSON

## 3. Environment variables

- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` — one line, literal `\n`, quotes optional
- [ ] `FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] Sanity-check the key:
      `node --env-file=.env -e "console.log(process.env.FIREBASE_PRIVATE_KEY.slice(0,40))"`
      → should print `-----BEGIN PRIVATE KEY-----\nMII…`

## 4. Deploy rules and indexes

- [ ] `npm i -g firebase-tools && firebase login`
- [ ] `firebase use <project-id>`
- [ ] `firebase deploy --only firestore,storage`
      (`firestore` covers rules **and** indexes — deploy both or the review
      queue fails)

## 5. Verify the connection — do not skip

- [ ] `/api/admin/firebase-status` returns
      `{ "configured": true, "reachable": true, "missing": [] }`
- [ ] It returns 401 when signed out

**Stop here if this fails.** Everything below assumes it passes.

## 6. Grant staff access

For each staff member:

- [ ] They open `/en/admin` and click **Continue with Google** once —
      *it will be refused, that is expected*; it creates the account
- [ ] `node --env-file=.env scripts/grant-admin.mjs someone@example.com`
- [ ] They sign out and back in (a claim only reaches a fresh token)
- [ ] They can reach the panel

## 7. Migrate the itineraries

- [ ] Take a JSON export from the admin panel — **this is the backup**
- [ ] Confirm `BLOB_READ_WRITE_TOKEN` is set, and that hidden itineraries
      appear in the admin list and export but not in anonymous
      `GET /api/itineraries`
- [ ] Dry run: `node --env-file=.env scripts/migrate-itineraries.mjs`
- [ ] Read the counts
- [ ] Commit: `node --env-file=.env scripts/migrate-itineraries.mjs --commit`
- [ ] Verify: admin list complete, custom-tour page correct, photographs load
      from `firebasestorage.googleapis.com`, translations survived, no
      duplicates
- [ ] *Only then*: delete the `itineraries/archive.json` blob by hand, remove
      `lib/itineraries/blobArchive.ts` and its branch in `repository.ts`, drop
      `@vercel/blob`

## 8. Verify the features

- [ ] **Admin** — sign in, create/edit/hide/delete an itinerary; photographs
      go to Storage rather than inline
- [ ] **The awaited-`requireAdmin` test** — signed in, `DELETE
      /api/admin/itineraries` with no id → 400 `missing_id`; signed out → 401.
      A 400 while signed out means a missing `await` and every admin check is
      open
- [ ] **Enquiries** — send one, confirm a `tourRequests` document appears,
      confirm WhatsApp still opens
- [ ] **Saved trips** — email-link sign-in at `/my-trip/<reference>`; amend it;
      confirm a `revisions` document and the original payload survive
- [ ] **Reviews** — invite yourself, submit with photographs, confirm the link
      cannot be reused, an expired one is refused, a rejected review's photos
      are gone from Storage, an approved one appears on the home page in the
      right language
- [ ] **Rules** — a browser Firestore read is denied; a browser write to
      `reviews/` in Storage is denied

## 9. Vercel

- [ ] Every variable from step 3 set for Production (and Preview if wanted)
- [ ] Production domain added to Firebase authorised domains
- [ ] Redeploy
- [ ] `/api/admin/firebase-status` green **in production**
- [ ] Repeat step 8 against production

## 10. Remove the legacy password path

Once at least one staff account signs in with Google:

- [ ] Legacy branch in `app/api/admin/session/route.ts`
- [ ] `PasswordSignIn` in `components/admin/AdminSignIn.tsx`
- [ ] `lib/admin/session.ts`
- [ ] `lib/admin/rateLimit.ts`
- [ ] The three `ADMIN_*` variables, locally and in Vercel

## 11. Final checks

- [ ] `npx tsc --noEmit`
- [ ] `npx eslint .`
- [ ] `npm run build`
- [ ] Update the status notes in `handoff.md`
