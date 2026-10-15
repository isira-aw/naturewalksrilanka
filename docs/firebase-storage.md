# Photographs live in Firebase Storage

Accounts are Firebase Auth, documents are Firestore, and photographs are the
project's Cloud Storage bucket. Everything goes through the Admin SDK, so
`storage.rules` allows public reads and denies every client write.

```
admin form                          review form
  → /api/admin/storage-upload-url     → /api/reviews
    (admin-only, returns signed PUT)    (validates, then uploads server-side)
  → browser PUTs the JPEG to the bucket
  → the delivery URL is stored on the Firestore record
```

## Environment

| Variable | Notes |
|---|---|
| `FIREBASE_STORAGE_BUCKET` | Bucket name, e.g. `my-project.firebasestorage.app` (no `gs://`) |

Signing uses the existing service-account key. Without the bucket variable,
uploads report themselves unavailable and the rest of the site is unaffected.
`/api/admin/firebase-status` reports `storage.configured`.

## One-time setup

1. Upgrade the Firebase project to the **Blaze** plan (required by Cloud
   Storage for Firebase) and enable Storage.
2. `firebase deploy --only storage` to publish `storage.rules`.
3. Put your real domain in `storage-cors.json`, then
   `gcloud storage buckets update gs://<bucket> --cors-file=storage-cors.json`.
   Without CORS the admin's browser `PUT` is blocked.

## Why the two paths differ

**Itinerary photographs upload direct from the browser** under a signed URL
that is valid ten minutes and bound to one object path and `image/jpeg`. The
route is admin-only and rebuilds the path from the itinerary id using a safe
alphabet, so a caller cannot redirect the file.

**Review photographs are uploaded by the server**, because the limits (at most
four, 3 MB each, allowlisted type) must be enforced somewhere the submitter
does not control.

## Delivery

`https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?alt=media`,
rendered through `next/image` (host is in `remotePatterns` and the CSP).
Objects are written with a one-year immutable `Cache-Control`; each upload gets
a fresh path so a replaced photograph never collides with a cached one.

## Not yet proven

No Firebase project has been connected to this repository. Before trusting it:

- [ ] `/api/admin/firebase-status` shows `storage.configured: true`
- [ ] Upload an itinerary photograph; it appears under `naturewalk/itineraries/<id>/`
- [ ] It renders on the custom-tour page through `next/image`
- [ ] Submit a review with a photograph; it lands under `naturewalk/reviews/<id>/`
- [ ] Reject that review; the object is gone from the console
- [ ] An upload with the admin signed out fails rather than falling back
