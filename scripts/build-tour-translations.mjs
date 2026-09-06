/**
 * Rebuilds content/<locale>/tours.json from the English structure plus the prose
 * overlay in content/_translations/tours.<locale>.json.
 *
 * Structure (slugs, day labels, contentRequired flags, image paths, destination
 * and activity references) always comes from English so the locales cannot drift
 * apart; only human-readable strings are taken from the overlay. Anything the
 * overlay omits — species highlights, internal `_note` / `note` review comments —
 * keeps its English value.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["nl", "es", "da", "fi"];

const base = JSON.parse(readFileSync(join(root, "content/en/tours.json"), "utf8"));

for (const locale of locales) {
  const overlayPath = join(root, `content/_translations/tours.${locale}.json`);
  if (!existsSync(overlayPath)) {
    console.warn(`skipped ${locale}: no overlay at ${overlayPath}`);
    continue;
  }
  const overlay = JSON.parse(readFileSync(overlayPath, "utf8"));

  const translated = base.map((tour) => {
    const t = overlay[tour.slug];
    if (!t) throw new Error(`${locale}: overlay is missing tour "${tour.slug}"`);
    if (t.highlights.length !== tour.highlights.length) {
      throw new Error(`${locale}/${tour.slug}: expected ${tour.highlights.length} highlights, got ${t.highlights.length}`);
    }
    if (t.itinerary.length !== tour.itinerary.length) {
      throw new Error(`${locale}/${tour.slug}: expected ${tour.itinerary.length} itinerary days, got ${t.itinerary.length}`);
    }
    return {
      ...tour,
      title: t.title,
      tagline: t.tagline,
      summary: t.summary,
      highlights: t.highlights,
      itinerary: tour.itinerary.map((day, i) => ({
        ...day,
        location: t.itinerary[i].location,
        title: t.itinerary[i].title,
        description: t.itinerary[i].description,
      })),
      _reviewStatus: "needs-native-review",
    };
  });

  const out = join(root, `content/${locale}/tours.json`);
  writeFileSync(out, `${JSON.stringify(translated, null, 2)}\n`);
  console.log(`wrote ${out}`);
}
