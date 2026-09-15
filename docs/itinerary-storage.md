# Where itineraries live, and how to move them

The custom-tour wizard offers a list of prebuilt itineraries. They used to be
checked into `content/<locale>/experiences.json` by hand. They are now authored
in the admin page (`/<locale>/admin`) instead.

## Today: Firestore, with the blob archive as a fallback

`lib/itineraries/repository.ts` is the server-side facade, and it chooses at
runtime:

- **Firestore when `isFirebaseConfigured()`** — one document per itinerary in
  the `itineraries` collection (`lib/itineraries/firestoreStore.ts`).
- **The old Vercel Blob archive when it is not** — a single JSON blob at
  `itineraries/archive.json` (`lib/itineraries/blobArchive.ts`).

The fallback exists because the migration cannot be atomic across a deploy: a
half-configured environment must still serve the custom-tour page rather than
showing visitors an error. **It is temporary.** Once the Firestore data is
verified, delete `blobArchive.ts`, drop `@vercel/blob`, and let the repository
call Firestore directly. `docs/FIREBASE_INTEGRATION.md` §9 is the migration
procedure.

> **The Firestore path has never run.** No Firebase project exists yet, so
> everything above is written but unproven — only the blob branch has actually
> executed. See the status note at the top of `FIREBASE_INTEGRATION.md`.

### Why one document per itinerary matters

The blob path does a whole-file read-modify-write with no locking, so **two
admins saving at once silently overwrite each other**. On Firestore a save
touches one document, so they do not. That race is the single best reason to
finish the migration rather than leaving the fallback in place indefinitely.

On Firestore a malformed document is logged and skipped rather than failing the
whole list — returning fewer itineraries is bad, returning none is worse. An
import with `replace` runs as one atomic batch and refuses outright above 500
operations rather than applying in halves.

### The routes, and the client

- `GET /api/itineraries` — public read, used by both the wizard and the admin
  page. Anyone visiting the site needs this to work, not just signed-in admins.
  Hidden records are filtered out for anonymous callers and returned in full
  when `requireAdmin(request)` passes — the admin list *and* its JSON export
  both read from here, so stripping them unconditionally would drop them from
  every export.
- `POST` / `PUT` / `DELETE /api/admin/itineraries` — admin-only writes.

The browser never talks to either backend directly. `lib/itineraries/store.ts`
is a client-side `ItineraryStore` over those two routes; its `blobItineraryStore`
export is named after the backend it was written against and now goes wherever
the repository points. It refetches on tab focus — an earlier 30-second poll
re-downloaded the whole archive on a timer for every open tab, including every
visitor sitting on the custom-tour page.

### Environment

| Variable | When |
|---|---|
| The Firebase server variables | The Firestore path. See `docs/FIREBASE_INTEGRATION.md` §2 |
| `BLOB_READ_WRITE_TOKEN` | The blob fallback. Needed until the migration is done and the blob path is removed |

Neither is set in local development by default, so the archive reads as empty
and no write can succeed locally on either path.

## The shape of the data

Everything is defined in `lib/itineraries/types.ts` and is written as if a
real relational database were behind it:

| Field | Why it is there |
| --- | --- |
| `id` | Stable across every edit — the primary key a table would use. Never derived from the title. Also the Firestore document id. |
| `slug` | The public identifier. Re-derived from the head on save, kept unique across records. |
| `createdAt` / `updatedAt` | Ordinary row timestamps. |
| `translations` | Per-locale sub-records with their own status, not parallel files. A locale that is not `ready` falls back to English. |
| `images`, `highlights[].image` | Firebase Storage URLs once uploaded; base64 data URLs on the fallback path, when there is no signed-in Firebase user to attribute the upload to. Both are just strings, which is why the field did not change shape. |
| `imageBlur` | Blur placeholders, **keyed by the image's own URL** rather than parallel to `images` — so reordering or removing an image cannot pair a photograph with somebody else's placeholder. Optional; a record without it renders as it did before the field existed. |

The exported archive (*Data and migration* → *Export everything*) wraps
those records in `{ schemaVersion, exportedAt, records }`. `SCHEMA_VERSION` is
bumped whenever the record shape changes; old exports keep importing.

## Moving to a different backend

Everything above the repository — the admin screens and the wizard — talks to
the `ItineraryStore` interface in `lib/itineraries/store.ts` and the two API
routes, never to Firestore or `@vercel/blob` directly. So the move is:

1. Write a third branch in `lib/itineraries/repository.ts` against your new
   backend. Nothing above it changes.
2. Export from *Data and migration* and import that JSON into the new
   backend — ids come across intact, so nothing has to be re-keyed and no
   record is lost.
3. Point image uploads at the new object store in
   `lib/itineraries/imageUpload.ts`. Nothing reads `images` as anything more
   specific than a string.
