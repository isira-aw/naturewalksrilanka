# Handoff — country-flag language switcher & destination image wiring

## Goal

Two related pieces of work:

1. Rebuild the language switcher (`LocaleSwitcher`) so it reads as a country
   picker with real flags, matching a reference screenshot of a full-screen
   "choose your country" modal — but scoped to this site's actual 5 markets
   (English, Nederlands, Español, Dansk, Suomi), not the ~20-country grid in
   the screenshot. The label shown must be the **country**, not the language
   (e.g. "United Kingdom", not "English").
2. Wire the 3 photographs that now exist in each of the 15
   `public/images/destinations/<slug>/` folders into the site, distributed
   across different spots on the page (not all stacked in one place), with
   the folder-name-matching file always used as the top hero image.

## Current state

Both pieces are done. `tsc --noEmit` is clean. A Node script confirmed every
image path referenced in all 5 locale content files resolves to a real file
in `public/`, and a second check confirmed no UTF-8 mojibake was introduced
in any of the 5 destinations.json files.

Not yet done: no visual/browser check of the new modal or the destination
pages with real photos (see Next steps).

## Active files

| File | Role |
| --- | --- |
| `components/layout/LocaleSwitcher.tsx` | Trigger button + full-screen modal (was a small dropdown) |
| `components/layout/Header.tsx`, `Footer.tsx`, `MobileNav.tsx` | Unchanged — all three just render `<LocaleSwitcher />`, still work as-is |
| `i18n/routing.ts` | Source of the 5 locales; not modified, just read |
| `content/en/destinations.json` | Full destination copy; `image`/`heroImage`/`gallery` fields rewired to real files |
| `content/da/destinations.json` | Minimal copy (needs-native-review); same three fields rewired, pretty-printed like `en` |
| `content/nl/destinations.json`, `content/es/destinations.json`, `content/fi/destinations.json` | Minimal copy; same three fields rewired, kept in their existing one-object-per-line compact style |
| `lib/content/schema.ts` | Defines `image`, `heroImage`, `gallery` on `destinationSchema` — not modified, already supported all three fields |
| `lib/content/images.ts` | Falls back to placeholder if a referenced path doesn't exist on disk — not modified, this is what silently masked the previously-broken image paths |
| `app/[locale]/destinations/[slug]/page.tsx` | Consumes `heroImage ?? image` for `PageHero`, `gallery` for `DestinationGallery` — not modified |
| `components/destinations/DestinationGallery.tsx` | Renders the gallery rail — not modified |
| `public/images/destinations/<slug>/` (×15) | Each now holds 3 real images (`<slug>.<ext>`, `<slug>2.<ext>`, `<slug>3.<ext>`) plus a `.gitkeep` |

## Changes made

**LocaleSwitcher** — was a small listbox dropdown (`<ul role="listbox">`
absolutely positioned under the trigger). Rewritten to a full-screen modal
via `createPortal`, following the same dialog pattern already used by
`ExperienceDialog.tsx` (focus-trap-lite via ref, `Escape` to close, body
scroll lock while open). The modal has a centered heading, an X close
button top-right, and a responsive grid (1 col mobile, 2 cols `sm:`) of
country rows — each a round flag badge + country name + a checkmark on the
active one. Flags are rendered as real `<img>` SVGs from `flagcdn.com`
(`https://flagcdn.com/{iso}.svg`), not emoji: Windows browsers generally
don't have flag-emoji glyphs and fall back to the two-letter code, so emoji
were a dead end here (see Failed attempts). Labels were changed from the
language endonym (`localeNames`, e.g. "Dansk") to a country name
(`localeCountries`, e.g. "Denmark") per explicit instruction — a locale is a
market, and the flag needs a country to point at, not a language.

Locale → country/flag mapping added in the component:
`en → United Kingdom (gb)`, `nl → Netherlands (nl)`, `es → Spain (es)`,
`da → Denmark (dk)`, `fi → Finland (fi)`.

**Destination images** — `lib/content/images.ts` silently falls back to a
placeholder for any path that doesn't exist on disk, which is exactly what
was happening: the `en` destinations.json referenced `hero.jpg`, `cover.jpg`
and `01.jpg`–`04.jpg` per destination, none of which exist; the other 4
locales only had a stub `image: "/images/placeholder-destination.jpg"`. A
one-off Node script (not committed) rewrote all 5 locale files so that, per
destination:
- `heroImage` → the file matching the folder name exactly (e.g.
  `negombo/negombo.jpg`) — this is what `PageHero` on the detail page shows,
  and it's guaranteed to always be that same-name file.
- `image` → the second file (e.g. `negombo2.jpg`) — this is what the
  `/destinations` listing page card uses, a different page entirely.
- `gallery` → a single entry with the third file (e.g. `negombo3.jpg`) —
  this is what `DestinationGallery` renders lower down the *same* detail
  page, in the gallery rail section, a different spot from the hero.

For `en`, the existing gallery entries' `alt`/`caption` text was preserved
(only the `src` was swapped to a real file) since those captions are
already good hand-written English. For the minimal locales, `gallery[0].alt`
falls back to the destination's `name` field since there was no caption text
to carry over. The stale `_note: "...; photographs not yet supplied."` on
all 15 `en` entries was also updated to drop the now-false clause, since
photographs are supplied now.

`nl`/`es`/`fi` were kept in their original one-object-per-line compact JSON
style (not reformatted to pretty multi-line) to keep the diff to just the
three touched fields per destination.

## Failed attempts

- **Emoji flags** (🇬🇧, 🇳🇱, etc.) as the first pass at the modal. Looked
  correct in the editor but Windows — this is a Windows 11 dev machine —
  generally has no flag-emoji glyphs in its fonts, and most browsers there
  render the two-letter ISO code as text instead of a picture. Replaced
  with real SVG images from `flagcdn.com` via plain `<img>` (a lint warning
  suggests `next/image` instead; left as `<img>` since these are tiny
  external icons, not local optimizable assets).
- **PowerShell `Get-Content`/`Set-Content` to patch a string in
  `content/en/destinations.json`.** Corrupted the file's em dashes into
  mojibake — the exact same failure mode already documented in an earlier
  handoff for this repo (custom-tour layout work): Windows PowerShell
  5.1's `Get-Content` reads a BOM-less UTF-8 file as the system ANSI
  codepage. Caught immediately by diffing for the mojibake sequence,
  reverted with `git checkout --`, and redone with a small Node
  `fs.readFileSync(..., 'utf8')` / `writeFileSync(..., 'utf8')` script
  instead. **Do not use PowerShell `Get-Content`/`Set-Content` on any file
  in this repo containing non-ASCII characters — use Node or the Edit tool.**
- **First draft of the image-wiring script used `JSON.stringify(data, null, 2)`
  for every locale.** Would have reformatted `nl`/`es`/`fi` from their
  existing one-object-per-line compact style into fully pretty multi-line
  JSON, a huge unrelated diff. Split the script into two code paths: pretty
  (`en`, `da`, which were already in that style) vs. a hand-rolled compact
  single-line serializer preserving key order (`nl`, `es`, `fi`).

## Next steps

1. **Visual check of the new locale modal**, ideally against `next dev`,
   at a phone width and a desktop width — it has not been opened in a
   browser yet, only typechecked. Confirm the flag SVGs actually load (they
   are a live network fetch to `flagcdn.com`; there's no local fallback if
   that's unreachable at build/runtime) and that the modal's `Escape`/click-
   outside/focus behavior feels right.
2. **Visual check of destination pages with real photos** — `/en/destinations`
   listing (card thumbnails) and a few `/en/destinations/<slug>` detail pages
   (hero + gallery rail), across `en` and at least one minimal locale (e.g.
   `da`) to confirm the gallery rail renders correctly with just one image
   in it.
3. **`next.config.ts` doesn't currently allowlist `flagcdn.com`** — this
   doesn't matter for a plain `<img>` tag (no Next Image optimization
   involved), but if this ever gets swapped to `next/image` per the lint
   warning, `images.remotePatterns` will need `flagcdn.com` added.
4. **Only one gallery image per destination.** The gallery rail component
   supports multiple images and reads fine with just one, but if more
   photographs get supplied later per destination, `gallery` should become
   an array of all of them rather than staying capped at one — the "3 images,
   3 different spots" split was a decision forced by only having 3 source
   photos per folder, not a hard rule to preserve going forward.
5. Delete this file before merge if the team does not keep handoff notes
   in-tree. (Note: a different, unrelated handoff — for an itineraries/PDF
   feature — was found occupying this same path when this file was written;
   that work is not described here.)
