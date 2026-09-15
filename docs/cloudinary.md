# Photographs live on Cloudinary

Cloudinary replaces **Firebase Storage, and only Firebase Storage**. Accounts
are still Firebase Auth and every document is still Firestore. Cloudinary has
no users and no database, so there is no version of this where it takes over
more than the image files.

```
admin form                     review form
  → /api/admin/cloudinary-signature   → /api/reviews
    (admin-only, returns a signature)     (validates, then uploads)
  → browser uploads direct to Cloudinary
  → the delivery URL is stored on the Firestore record
```

## Environment

Three variables, from **Dashboard → Settings → API Keys**:

| Variable | Notes |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Public — it is in the host of every delivery URL |
| `CLOUDINARY_API_KEY` | Public-ish; it is sent with each upload |
| `CLOUDINARY_API_SECRET` | **A genuine secret.** Signs uploads. Never sent to the browser |

Without them, uploads report themselves unavailable and the rest of the site
is unaffected — the same degradation Firebase has.
`/api/admin/firebase-status` reports which of the three are missing.

`next.config.ts` lists `res.cloudinary.com` in `remotePatterns`. Without it
`next/image` refuses the URLs, silently from the page's point of view.

## Why the two paths differ

**Itinerary photographs upload direct from the browser.** They are several
megabytes, and routing them through a serverless function buys nothing but
latency and a request-size limit to trip over. The browser cannot hold the
API secret, so it asks `/api/admin/cloudinary-signature` for a signature
first.

That route is what makes this safe. It is admin-only, and it decides the
`folder` and `public_id` itself from the itinerary id, then signs them.
Cloudinary rejects any upload whose parameters do not match the signature, so
a caller holding one cannot redirect the file elsewhere, overwrite another
image, or keep using it once the timestamp ages out. Both values are rebuilt
from a safe alphabet before signing, because they end up in a path.

**Review photographs are uploaded by the server.** The limits — at most four,
3 MB each, and an allowlisted content type — have to be enforced somewhere the
submitter does not control. A traveller holding a review link has no account
to attribute an upload to, a client-side check is a courtesy to honest users
and nothing more, and the decoded byte length of a data URL is not something
an upload preset can see. So the bytes reach `lib/reviews/store.ts` first, get
checked, and only then go on.

## No SDK

The whole surface needed here is "upload one image" and "delete one image",
which is two signed POSTs. The `cloudinary` package would add a dependency
tree for that, and this repository has twice been taken down by a lockfile
that shifted underneath it — see the `jose` override in `package.json` and
*Failed attempts* in `handoff.md`. `node:crypto` signs the requests instead.

Signing is Cloudinary's documented recipe, in `lib/cloudinary/sign.ts`: take
every parameter that will be sent except `file`, `api_key` and
`resource_type`, sort by key, join as a query string, append the secret, SHA-1
it. Getting the parameter set or the ordering subtly wrong produces a 401 that
says nothing about which parameter drifted, which is why every signed call
goes through `signedParams` rather than assembling its own form data.

## Images from before the switch

A record written while photographs still lived in Firebase Storage holds an
absolute `firebasestorage.googleapis.com` URL. Those **still render** — both
Storage hosts remain in `next.config.ts` `remotePatterns` for exactly that
reason — but:

- nothing uploads there any more;
- rejecting such a review can no longer delete its files. `deletePhotos` logs
  the URL and says so; remove it from the Firebase console by hand.

`reviewPhotoSchema.publicId` is optional for the same reason: a photo from
before the switch has no Cloudinary handle. New photos always carry one.

Once no record references the old host, drop the two Firebase entries from
`remotePatterns` and delete the bucket.

## What has not been proven

**No Cloudinary account has ever been connected**, exactly as no Firebase
project has. The signing implementation is unit-tested against Cloudinary's
documented recipe, and the signature route is verified to return 401
unauthenticated — but no image has been uploaded, deleted or delivered.

Before trusting this in production:

- [ ] Set the three variables and confirm `/api/admin/firebase-status` shows
      `cloudinary.configured: true`
- [ ] Upload an itinerary photograph in the admin form; confirm it appears in
      the Cloudinary console under `naturewalk/itineraries/<id>/`
- [ ] Confirm the photograph renders on the custom-tour page through
      `next/image`
- [ ] Submit a review with a photograph; confirm it lands under
      `naturewalk/reviews/<id>/`
- [ ] Reject that review; confirm the file is gone from the console
- [ ] Try an upload with the admin signed out — it must fail, not fall back
