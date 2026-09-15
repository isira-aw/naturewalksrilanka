# Firebase setup checklist

The steps from `docs/FIREBASE_INTEGRATION.md`, in order, as a list to tick off.
Read that document for the reasoning behind any step. **Never commit real
secrets.**

Do these in order. Each one depends on the ones above it.

## 0. Node 22

- [ ] `node -v` reports 22 or newer locally
- [ ] The hosting project's Node version setting says 22 (the `engines` field
      in `package.json` does not rebuild an existing deployment)

`firebase-admin@14` requires it, and running below it returns 500 on **every**
page, not just the Firebase-backed ones.

## 1. Admin panel — nothing to do here

There is no separate admin credential any more. The panel is reachable only
once Firebase is configured and your own account has been granted access, which
is steps 2, 3 and 6 below. **Do them in order — you cannot sign in before
step 6.**

- [ ] Delete `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` from
      Vercel and from any local `.env` if they are still set. Nothing reads
      them.

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
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
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

## 5. Grant yourself access — this is also the credential test

There is no shared password to sign in with, so the first admin is created from
the command line. `grant-admin.mjs` uses the same service-account credentials
the site does and touches both Auth and Firestore, so if it succeeds, they work.

- [ ] Open `/en/admin` and click **Continue with Google** once —
      *it will be refused, that is expected*; it creates the Firebase account
- [ ] `node --env-file=.env scripts/grant-admin.mjs you@example.com`
- [ ] Sign out and back in (a claim only reaches a fresh token)
- [ ] You can reach the panel

**Stop here if this fails.** The script prints what went wrong; everything
below assumes it passes. Repeat the three steps for each other staff member.

## 6. Verify the connection — do not skip

Now that you can sign in, confirm the running deployment agrees:

- [ ] `/api/admin/firebase-status` returns
      `{ "configured": true, "reachable": true, "missing": [] }`
- [ ] It returns 401 when signed out

## 7. Check the itinerary store

Firestore is the only itinerary store, and always has been for this codebase.
There is nothing to migrate from.

- [ ] Take a JSON export from the admin panel — **this is the backup**
- [ ] Confirm hidden itineraries appear in the admin list and export but not
      in anonymous `GET /api/itineraries`
- [ ] Verify: admin list complete, custom-tour page correct, photographs load
      from `firebasestorage.googleapis.com`, translations survived, no
      duplicates

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

## 10. Confirm there is only one way in

The shared-password path has been removed from the code. Check nothing is left
behind it:

- [ ] `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` deleted from
      Vercel
- [ ] Signing out and reloading `/en/admin` offers **only** "Continue with
      Google"
- [ ] An account that is not on the staff list is refused

## 11. Final checks

- [ ] `npx tsc --noEmit`
- [ ] `npx eslint .`
- [ ] `npm run build`
- [ ] Update the status note at the top of `FIREBASE_INTEGRATION.md`
