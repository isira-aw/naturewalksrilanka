# Where itineraries live

The custom-tour wizard offers a list of prebuilt itineraries. They used to be
checked into `content/<locale>/experiences.json` by hand. They are now authored
in the admin page (`/<locale>/admin`) and stored in Firestore.

## One store

Firestore, one document per itinerary in the `itineraries` collection. That is
the whole answer — there is no second backend, no fallback and no runtime
choice to make.

```
admin screens / custom-tour wizard
  → lib/itineraries/browserStore.ts (browser; wraps the two routes below)
  → /api/itineraries                (public read)
    /api/admin/itineraries          (admin-only writes)
  → lib/itineraries/store.ts        (server; the only code touching Firestore)
  → Firestore
```

An older design kept every record in a single JSON file, with a
`repository.ts` choosing between backends at runtime. Both are gone. One
document per itinerary is what removes the write race the single file had: a
whole-file read-modify-write with no locking meant **two admins saving at once
silently overwrote each other**.

A malformed document is logged and skipped rather than failing the whole list —
returning fewer itineraries is bad, returning none is worse. An import with
`replace` runs as one atomic batch and refuses outright above 500 operations
rather than applying in halves.

## The routes

- `GET /api/itineraries` — public read, used by both the wizard and the admin
  page. Anyone visiting the site needs this to work, not just signed-in admins.
  Hidden records are filtered out for anonymous callers and returned in full
  when `requireAdmin(request)` passes — the admin list *and* its JSON export
  both read from here, so stripping them unconditionally would drop them from
  every export. A Firestore failure answers 503, which the client renders as an
  empty suggestions list.
- `POST` / `PUT` / `DELETE /api/admin/itineraries` — admin-only writes.

The browser never talks to Firestore directly; `firestore.rules` denies it.
`lib/itineraries/browserStore.ts` is a thin client over those two routes and
holds no data of its own. It refetches on tab focus — an earlier 30-second poll
re-downloaded the whole archive on a timer for every open tab, including every
visitor sitting on the custom-tour page.

## Environment

The Firebase server variables, and nothing else. See
`docs/FIREBASE_INTEGRATION.md` §2. They are not set in local development by
default, so route handlers that need Firestore report themselves unavailable
and the public pages carry on.

## The shape of the data

Everything is defined in `lib/itineraries/types.ts` and is written as if a
real relational database were behind it:

| Field | Why it is there |
| --- | --- |
| `id` | Stable across every edit — the primary key a table would use. Never derived from the title. Also the Firestore document id. |
| `slug` | The public identifier. Re-derived from the head on save, kept unique across records. |
| `createdAt` / `updatedAt` | Ordinary row timestamps. |
| `translations` | Per-locale sub-records with their own status, not parallel files. A locale that is not `ready` falls back to English. |
| `images`, `highlights[].image` | Firebase Storage URLs. Records written before uploads became mandatory may hold a base64 data URL instead; both are just strings, which is why the field never changed shape. |
| `imageBlur` | Blur placeholders, **keyed by the image's own URL** rather than parallel to `images` — so reordering or removing an image cannot pair a photograph with somebody else's placeholder. Optional; a record without it renders as it did before the field existed. |

Photographs are uploaded to Firebase Storage from the admin form
(`lib/itineraries/imageUpload.ts`). There is no inline-base64 fallback: an
upload that cannot happen is an error the form shows, not a silently larger
record.

## Backups

**There is no export or import in the panel any more.** The *Data and
migration* section is gone, and with it the bulk `replace` that deleted
anything absent from an uploaded file — a destructive operation behind a
button nobody was using.

Backups are Firestore's job, which does them properly: point-in-time recovery
and scheduled exports to Cloud Storage, configured in the Firebase console
rather than taken by hand from a browser.

`{ schemaVersion, exportedAt, records }` survives as the shape
`GET /api/itineraries` answers in, because the browser store parses it.
