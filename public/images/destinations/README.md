# Destination photographs

Every destination page already asks for its own photographs by name. Until a
file exists here, the site falls back to `/images/placeholder-destination.jpg`
(cover and hero) and simply omits the gallery — so a destination with no photos
still renders as a finished page, and a destination with three of four photos
shows three. Nothing in the code or the content files needs changing when the
real images land: drop them in with these names and redeploy.

## Folder per destination

One folder per slug, exactly as spelled in `content/en/destinations.json`:

```
public/images/destinations/
├── negombo/
├── wilpattu/
├── anuradhapura/
├── trincomalee/
├── sigiriya/
├── polonnaruwa/
├── kandy/
├── kithulgala/
├── ella/
├── yala/
├── sinharaja/
├── nuwara-eliya/
├── horton-plains/
├── tissamaharama/
└── mirissa/
```

## Files in each folder

| File | Where it appears | Aspect | Minimum size |
|------|------------------|--------|--------------|
| `hero.jpg` | Full-bleed banner at the top of the destination page | 16:9 landscape | 2400 × 1350 |
| `cover.jpg` | The card on /destinations and the home page rail | 3:4 portrait | 1200 × 1600 |
| `01.jpg` … `04.jpg` | The gallery further down the page | 4:3 landscape | 1600 × 1200 |

The subject each gallery frame is captioned for is listed as `gallery[].alt` in
`content/en/destinations.json` — for example, Sigiriya's `02.jpg` is captioned
"The lion's paws at the foot of the final stairway". Either supply a photograph
matching that caption, or edit the caption in the content file to match the
photograph you have. A caption that does not describe its picture is worse than
no gallery at all.

## Before you export

- JPEG, quality ~80. Next.js re-encodes and resizes on demand, so there is no
  need to ship several sizes — but do not upload a 12 MB camera original.
- Landscape frames should have their subject slightly off-centre; the hero is
  cropped hard on small screens.
- Photograph the place, not the group: portraits of travellers belong in the
  tour and testimonial photography, not here.
- Check you have the right to publish every image, including any recognisable
  person in it.
