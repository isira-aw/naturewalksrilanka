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
  → lib/itineraries/store.ts        (browser; wraps the two routes below)
  → /api/itineraries                (public read)
    /api/admin/itineraries          (admin-only writes)
  → lib/itineraries/firestoreStore.ts
  → Firestore
```

An older design kept every record in a single JSON file on Vercel Blob, with a
`repository.ts` choosing between the two at runtime. Both are gone. One
document per itinerary is what removes the write race the single file had: a
whole-file read-modify-write with no locking meant **two admins saving at once
silently overwrote each other**.

A malformed document is logged and skipped rather than failing the whole list —
returning fewer itineraries is bad, returning none is worse. An import with
`replace` runs as one atomic batch and refuses outright above 500 operations
rather than applying in halves.

> **Migrating from the old archive?** `scripts/migrate-itineraries.mjs` is the
> one-off CLI that moves records out of Vercel Blob into Firestore. It is the
> only remaining reference to Vercel Blob anywhere in the repository. Run it,
> check the admin panel, then delete the script and the `@vercel/blob`
> devDependency. `docs/FIREBASE_INTEGRATION.md` §9 is the procedure.

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
`lib/itineraries/store.ts` is a thin client over those two routes and holds no
data of its own. It refetches on tab focus — an earlier 30-second poll
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

*Data and migration* → *Export everything* wraps the records in
`{ schemaVersion, exportedAt, records }`. `SCHEMA_VERSION` is bumped whenever
the record shape changes, and old exports keep importing. Take one before any
bulk import — `replace` deletes anything absent from the file.
