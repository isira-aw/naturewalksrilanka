# Translation overlays

`tours.json` in each locale is generated, not hand-maintained: `content/en/`
holds the structure (slugs, day numbering, `contentRequired` flags, image
paths, destination and activity references) and the files here hold only the
translated prose for one locale each.

Bird and mammal species inside `tours.json` itinerary highlights deliberately
stay in their international English names — that is what field guides and
checklists use, and guessing at endemic species names in five languages would
introduce errors.

`experiences.json` — the prebuilt itineraries the custom-tour wizard offers —
is no longer built here. Itineraries are authored in the admin page and
translated from there through Gemini; see `lib/itineraries/`.

Regenerate after editing an overlay:

```bash
node scripts/build-translations.mjs
```

The script fails loudly if an overlay has the wrong number of highlights or
itinerary days, so the locales cannot drift apart.
