# Where itineraries live, and how to move them

The custom-tour wizard offers a list of prebuilt itineraries. They used to be
checked into `content/<locale>/experiences.json` by hand. They are now authored
in the admin page (`/<locale>/admin`) instead.

## Today: a Vercel Blob archive

Records live on the server as a single JSON blob (`itineraries/archive.json`
via `@vercel/blob`), read and written through `lib/itineraries/blobArchive.ts`
and two API routes:

- `GET /api/itineraries` — public read, used by both the wizard and the admin
  page. Anyone visiting the site needs this to work, not just signed-in admins.
- `POST` / `PUT` / `DELETE /api/admin/itineraries` — admin-only writes
  (`requireAdmin`, same cookie session as everything else under `/api/admin`).

This replaced an earlier `localStorage`-only implementation, which was
per-browser: an itinerary added on one device was invisible everywhere else.
That is fixed now — every device reads and writes the same server-side
archive.

Local dev needs a `BLOB_READ_WRITE_TOKEN` env var (from the project's Vercel
Blob store) in `.env.local`; production gets it automatically once a Blob
store is connected to the Vercel project.

## The shape of the data

Everything is defined in `lib/itineraries/types.ts` and is written as if a
real relational database were behind it:

| Field | Why it is there |
| --- | --- |
| `id` | Stable across every edit — the primary key a table would use. Never derived from the title. |
| `slug` | The public identifier. Re-derived from the head on save, kept unique across records. |
| `createdAt` / `updatedAt` | Ordinary row timestamps. |
| `translations` | Per-locale sub-records with their own status, not parallel files. A locale that is not `ready` falls back to English. |
| `images`, `highlights[].image` | Base64 data URLs, inline in the JSON blob. A move to object storage per-image would leave a URL here — the field does not change shape. |

The exported archive (*Data and migration* → *Export everything*) wraps
those records in `{ schemaVersion, exportedAt, records }`. `SCHEMA_VERSION` is
bumped whenever the record shape changes; old exports keep importing.

## Moving to a different backend

Everything above the store — the admin screens and the wizard — talks to the
`ItineraryStore` interface in `lib/itineraries/store.ts`, never to
`@vercel/blob` directly. So the move is:

1. Write a second implementation of `ItineraryStore` (and the two API routes
   it calls) against your new backend. The interface is unchanged.
2. Export from *Data and migration* and import that JSON into the new
   backend — ids come across intact, so nothing has to be re-keyed and no
   record is lost.
3. Optionally move `images` to object storage and rewrite each field to a URL.
   Nothing else reads them as data URLs specifically.
