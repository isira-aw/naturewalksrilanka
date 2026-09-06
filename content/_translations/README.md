# Translation overlays

`tours.json` and `experiences.json` in each locale are generated, not
hand-maintained: `content/en/` holds the structure (slugs, categories, day
numbering, `contentRequired` flags, image paths, destination and activity
references) and the files here hold only the translated prose for one locale
each.

Bird and mammal species inside `tours.json` itinerary highlights deliberately
stay in their international English names — that is what field guides and
checklists use, and guessing at endemic species names in five languages would
introduce errors. Species named inside an experience's `highlights` follow the
same rule; the surrounding notes are translated.

Regenerate after editing an overlay:

```bash
node scripts/build-translations.mjs
```

The script fails loudly if an overlay has the wrong number of highlights or
itinerary days, so the locales cannot drift apart.
