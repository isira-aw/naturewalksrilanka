# Where itineraries live, and how to move them

The custom-tour wizard offers a list of prebuilt itineraries. They used to be
checked into `content/<locale>/experiences.json` by hand. They are now authored
in the admin page (`/<locale>/admin`) instead, and this describes where that
data sits and how to move it to a real backend without losing any of it.

## Today: the browser

There is no backend and no database on this project yet, so the only
implementation of the store keeps records in `localStorage`, under the key
`nwsl.itineraries.v1`.

That has two consequences worth being blunt about:

- **Itineraries are per-browser.** An itinerary added on the office laptop is
  not visible to a traveller loading the site, or to a colleague on another
  machine. Until a backend exists, the admin page is an authoring tool whose
  output has to be carried somewhere — see below.
- **Clearing site data deletes them.** Export regularly, from *Data and
  migration*.

## The shape of the data

Everything is defined in `lib/itineraries/types.ts` and is written as if a
database were already behind it:

| Field | Why it is there |
| --- | --- |
| `id` | Stable across every edit — the primary key a real table would use. Never derived from the title. |
| `slug` | The public identifier. Re-derived from the head on save, kept unique across records. |
| `createdAt` / `updatedAt` | Ordinary row timestamps. |
| `translations` | Per-locale sub-records with their own status, not parallel files. A locale that is not `ready` falls back to English. |
| `images`, `highlights[].image` | Base64 data URLs. A backend would move these to object storage and leave a URL here — the field does not change shape. |

The exported archive wraps those records in
`{ schemaVersion, exportedAt, records }`. `SCHEMA_VERSION` is bumped whenever
the record shape changes, and `migrate()` in `lib/itineraries/store.ts` is where
an older archive is brought up to the current shape. Old exports keep importing.

## Moving to a backend

Everything above the store — the admin screens and the wizard — talks to the
`ItineraryStore` interface in `lib/itineraries/store.ts`, never to
`localStorage`. So the move is:

1. Write a second implementation of `ItineraryStore` that calls your API. The
   interface is seven methods and the record type does not change.
2. Point `useItineraries` (and the admin screens' direct `localItineraryStore`
   calls) at the new implementation.
3. Export from *Data and migration* on the browser that holds the itineraries,
   and feed that JSON to the new backend — the ids come across intact, so
   nothing has to be re-keyed and no record is lost.
4. Optionally move `images` to object storage and rewrite each field to a URL.
   Nothing else reads them as data URLs specifically.

Step 3 is the whole reason the export exists. Do it before decommissioning the
browser that holds the data.
