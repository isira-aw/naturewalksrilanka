# Photographs

Everything about getting images onto the site: where each one lives, what the
code does when a file is missing, and the one script to run after adding any of
them.

## The rule that makes all of this work

**Content names a photograph before the photograph exists.**
`lib/content/images.ts` checks, at build time, whether the file the content
file asks for is really in `public/`. If it is, it is used. If it is not:

| Missing file | What happens |
|---|---|
| A destination's `image` or `heroImage` | Falls back to `/images/placeholder-destination.jpg` |
| A destination `gallery` entry | That frame is dropped; the rest of the gallery renders |
| An experience highlight's `image` | The highlight renders as a lettered tile instead |

So a page never breaks over a photograph that has not been supplied yet, and
nothing in the code or the content files changes when the real one lands —
drop the file in and redeploy.

## Where each kind of photograph goes

| What | Where | Named by |
|---|---|---|
| Hero carousel on the home page | `public/images/hero/hero-1.jpg` … `hero-3.jpg` | The `SLIDES` list in `components/home/HeroShowcase.tsx` |
| Destination hero, cover and gallery | `public/images/destinations/<slug>/` | `content/<locale>/destinations.json` |
| Tour cards | `public/images/tours/` | `content/<locale>/tours.json` |
| Section headers reused across pages | `public/images/story-1.jpg`, `story-2.jpg`, `hero-2.jpg` | The page that uses them |
| Nandana's portrait | `public/images/nandana-portrait.jpg` | `content/<locale>/profile.json` |
| The social sharing card | `public/images/og-default.jpg` | `content/<locale>/seo.json` → `ogImage` |
| Itinerary photographs | Firebase Storage | Uploaded in the admin panel; see [`FIREBASE_INTEGRATION.md`](FIREBASE_INTEGRATION.md) §8 |

### Destinations

One folder per destination, named exactly as the slug is spelled in
`content/en/destinations.json`. The file names inside it are whatever the
content file says they are — there is no fixed convention the code enforces.
The set currently in the repository uses `<slug>.jpg` for the hero,
`<slug>2.jpg` for the card, and `<slug>3.jpg` for the gallery.

To change which photograph a destination uses, edit its `image`, `heroImage`
and `gallery[].src` in `content/en/destinations.json` — the other four locales
inherit the same paths.

| Role | Aspect | Minimum size |
|---|---|---|
| `heroImage` — full-bleed banner at the top of the page | 16:9 landscape | 2400 × 1350 |
| `image` — the card on /destinations and the home page rail | 3:4 portrait | 1200 × 1600 |
| `gallery[].src` — the gallery further down the page | 4:3 landscape | 1600 × 1200 |

Each gallery frame carries a caption in `gallery[].alt`, which is also its
alt text. Either supply a photograph matching the caption, or edit the caption
to match the photograph you have. **A caption that does not describe its
picture is worse than no gallery at all** — it is read aloud to anyone using a
screen reader.

### The social sharing card

`public/images/og-default.jpg` is **1200 × 630**, which is the size Facebook,
LinkedIn, WhatsApp and X all document for a large link card. If you replace it,
keep those dimensions: `lib/seo/metadata.ts` declares them in the `og:image`
tags, and a card whose real size disagrees with its declared size is laid out
wrongly by every crawler that trusts the declaration.

Any page can override it with its own photograph — a tour or destination page
already shares its own hero — so this file is the card for the home page and
the rest of the section pages only.

## After you drop any file in

Run the optimiser from the repository root:

```bash
npm run optimize-images                        # dry run — reports what it would do
node scripts/optimize-images.mjs --commit      # actually rewrites the files
```

It caps the longest edge at 2400, re-encodes at quality 78, and regenerates
`lib/images/blurData.generated.ts` — the tiny blurred placeholder that holds
each photograph's place while it loads. A file that skips this step still
renders; it just loads as a hole in the page first.

It is idempotent: a file already within the cap is left alone, and it refuses
to write when the saving would be under ten per cent, so running it again after
adding one photograph rewrites only that one.

`lib/images/blurData.generated.ts` is generated. Do not edit it by hand.

Two things it reports rather than fixes, because both mean renaming the file
and every reference to it: an opaque PNG that should be a JPEG, and a name with
characters that need escaping in a URL (spaces and brackets, for instance).

## Before you export

- JPEG, quality ~80. `next/image` re-encodes and resizes on demand and serves
  AVIF or WebP to browsers that take them, so there is no need to ship several
  sizes — but do not commit a 12 MB camera original either.
- Landscape frames should have their subject slightly off-centre; a hero is
  cropped hard on small screens.
- Photograph the place, not the group. Portraits of travellers belong with the
  tour and testimonial photography, not on a destination page.
- Check you have the right to publish every image, including any recognisable
  person in it. The downloadable itinerary documents carry these photographs
  out under the company's name.

## Provenance of the images currently in the repository

These are placeholders taken from the old static site, or generic stand-ins.
Every one of them should be replaced with the company's own photography before
launch.

| File | Taken from |
|---|---|
| `hero-2.jpg` | `naturewalksrilanka.com/img/mycarousel-2.jpg` |
| `nandana-portrait.jpg` | `naturewalksrilanka.com/img/me.jpg` |
| `story-1.jpg` | `naturewalksrilanka.com/img/package-21.jpg` |
| `story-2.jpg` | `naturewalksrilanka.com/img/package-12.jpg` |
| `og-default.jpg` | `naturewalksrilanka.com/img/mycarousel-1.jpg`, recropped to 1200 × 630 |
| `placeholder-destination.jpg` | `naturewalksrilanka.com/img/mycarousel-2.jpg` |
| `tours/tour-18-days.jpg` | `naturewalksrilanka.com/img/package-61.jpg` |
| `tours/tour-16-days.jpg` | `naturewalksrilanka.com/img/package-51.jpg` |
| `tours/tour-12-days.jpg` | `naturewalksrilanka.com/img/package-41.jpg` |
| `tours/tour-10-days.jpg` | `naturewalksrilanka.com/img/package-31.jpg` |

The photographs under `public/images/hero/` and `public/images/destinations/`
are real and destination-specific, not from this list.
