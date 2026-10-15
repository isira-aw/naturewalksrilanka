# Deploying on Firebase App Hosting

The site runs on **Firebase App Hosting** (Cloud Run behind Google's CDN), built
from this repository on every push to the live branch, and served at
**https://naturewalksrilanka.com**. It replaces Vercel.

Everything the platform needs from the repository is in two files:

| File | What it says |
|---|---|
| [`apphosting.yaml`](../apphosting.yaml) | Instance size and scaling, every environment variable, and which ones are secrets |
| [`firebase.json`](../firebase.json) | The backend's id (`naturewalksrilanka`) for `firebase deploy`, beside the Firestore and Storage rules |

Nothing below can be done from a code session. Each step needs the Firebase
console, a login, or access to the domain's DNS.

---

## 1. One-time setup

- [ ] **Blaze plan.** App Hosting needs it. Storage already did, so this is
      probably done.
- [ ] **Fill `apphosting.yaml`.** Replace every `REPLACE_ME` — the Firebase web
      app config (console → Project settings → Your apps), the project id, the
      bucket name and `SUPER_ADMIN_EMAIL`. Then
      `grep REPLACE_ME apphosting.yaml` must print nothing.
- [ ] **Create the backend**, from the repo root:

      firebase apphosting:backends:create --project <project-id>

      Connect the GitHub repository, set the root directory to `/`, the live
      branch to `main` and the backend id to `naturewalksrilanka`. Pick the
      region closest to the visitors who matter most — `europe-west4` suits the
      Dutch, Danish and Finnish markets better than a US region does. It
      cannot be changed later.
- [ ] **Create the one secret:**

      firebase apphosting:secrets:set GOOGLE_AI_API_KEY

      Say yes when it offers to grant the backend access. Skip this, and delete
      the entry from `apphosting.yaml`, if the translation panel is not wanted.
- [ ] **Give the runtime service account its roles.** There is no private key
      any more (`lib/firebase/admin.ts` uses the platform's identity), so the
      account App Hosting runs as must be allowed to do what the key used to.
      In console → IAM, find that account (shown under the backend's settings)
      and confirm it holds:

      | Role | For |
      |---|---|
      | Cloud Datastore User | Firestore reads and writes |
      | Firebase Authentication Admin | verifying sign-ins, custom claims |
      | Storage Object Admin | uploading and deleting photographs |
      | Service Account Token Creator, **on itself** | signing the admin's upload URLs |

      The last one is the easy one to miss. Without it everything works except
      the admin photograph upload, which fails with a permission error about
      `signBlob`.
- [ ] **Apply `storage-cors.json`** — see [`firebase-storage.md`](firebase-storage.md).
      It already allows `https://naturewalksrilanka.com`. For the test rollout
      in §2, temporarily add the backend's `https://…hosted.app` origin too, or
      the admin photograph upload is refused by the browser.

## 2. First rollout, before the domain moves

`naturewalksrilanka.com` is the live site today, so the new one must be tested
somewhere else first. App Hosting gives the backend a default address of the
form `https://<backend>--<project>.<region>.hosted.app`.

`proxy.ts` deliberately **redirects that address, and `www.`, to the canonical
domain**, so that they never become second copies of the site in a search
index. Before the domain has moved, that redirect would send every test visit
to the old site. So for the test rollout only:

1. Set `NEXT_PUBLIC_SITE_URL` in `apphosting.yaml` to the backend's own
   `https://…hosted.app` address (no trailing slash). The site then treats that
   as its canonical origin and does not redirect.
2. Roll out, and work through [`FIREBASE_SETUP_CHECKLIST.md`](FIREBASE_SETUP_CHECKLIST.md)
   against it. Add the `hosted.app` address to Firebase Auth's authorised
   domains for the test, or sign-in will be refused.
3. **Set `NEXT_PUBLIC_SITE_URL` back to `https://naturewalksrilanka.com`
   before the cutover.** It is read at build time, so it needs a new rollout.

## 3. Cutover to naturewalksrilanka.com

- [ ] Console → App Hosting → the backend → **Settings → Domains → Add custom
      domain**: `naturewalksrilanka.com`. The console shows the DNS records to
      create (a TXT record to prove ownership, then the records that point the
      name at the backend). Use exactly what it shows.
- [ ] Add `www.naturewalksrilanka.com` the same way. `proxy.ts` redirects it
      to the bare domain with a 301, so it needs no content of its own.
- [ ] **Lower the DNS TTL a day beforehand**, so a mistake is undone in
      minutes, not hours.
- [ ] Wait for the certificate. The console reports when it is issued; until
      then the domain serves a certificate error, which is why this is done
      with the old site still reachable at its previous address.
- [ ] `NEXT_PUBLIC_SITE_URL=https://naturewalksrilanka.com` is set and rolled
      out (step 2.3).
- [ ] Add `naturewalksrilanka.com` and `www.naturewalksrilanka.com` to Firebase
      Auth → Settings → **Authorized domains**.
- [ ] Verify, in this order:
      1. `https://www.naturewalksrilanka.com/en` → 301 to the bare domain
      2. `https://naturewalksrilanka.com/robots.txt` names the real sitemap
      3. `https://naturewalksrilanka.com/llms.txt` and `/llms-full.txt` load
      4. The old static site's URLs (`/single18.html`, …) 301 to the new routes
      5. `/api/admin/firebase-status` → `{ "configured": true, "reachable": true }`
      6. Admin sign-in with Google, an itinerary photograph upload, a test enquiry

## 4. Authentication domain

`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is `<project-id>.firebaseapp.com`, and that
is the right value to leave it at. The Google sign-in pop-up runs on that
domain, which the CSP already allows (`frame-src … https://*.firebaseapp.com`).

Pointing it at `naturewalksrilanka.com` instead would mean App Hosting also
serving Firebase's `/__/auth/*` handler on that domain, which it does not do on
its own. Only consider it if Safari or Firefox sign-in starts failing from
third-party storage partitioning — and then the fix is to proxy that path, not
only to change the variable.

## 5. Retiring Vercel

Only once step 3 is verified:

- [ ] Remove `naturewalksrilanka.com` from the Vercel project's domains.
- [ ] Delete the Vercel project, which also removes the environment variables
      that were stored there — including the Firebase private key, which is
      the reason it matters. If the service-account key it used was only for
      this site, revoke it too (console → Project settings → Service accounts
      → manage in Google Cloud → Keys). Nothing reads it any more.
- [ ] Disconnect the Vercel GitHub app from the repository.

## 6. Day to day

- **Deploying** is a push to `main`. App Hosting builds and rolls out; a failed
  build leaves the previous rollout serving.
- **Rolling back** is console → App Hosting → the backend → Rollouts, and
  promoting an earlier one.
- **Changing a variable** means editing `apphosting.yaml` and pushing. The
  `NEXT_PUBLIC_` ones are baked in at build time, so they need a new rollout.
- **Logs** are in Google Cloud Logging, under the backend's Cloud Run service.
  Where an older doc says "Vercel logs", read that.
- **Node 22** is read from `engines` in `package.json`; there is no separate
  project setting to keep in step with it.
