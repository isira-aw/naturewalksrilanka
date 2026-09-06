# Tour translation overlays

`tours.json` in each locale is generated, not hand-maintained: `content/en/tours.json`
holds the structure (slugs, day numbering, `contentRequired` flags, image paths,
destination/activity references) and the files here hold only the translated prose
for one locale each.

Bird and mammal species inside `itinerary[].highlights` deliberately stay in their
international English names — that is what field guides and checklists use, and
guessing at endemic species names in five languages would introduce errors.

Regenerate after editing an overlay:

```bash
node scripts/build-tour-translations.mjs
```
