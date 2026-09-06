/**
 * Rebuilds the translated content files that are generated rather than authored:
 *
 *   content/<locale>/tours.json        from content/_translations/tours.<locale>.json
 *   content/<locale>/experiences.json  from content/_translations/experiences.<locale>.json
 *
 * English owns the structure — slugs, categories, day labels, contentRequired
 * flags, image paths, destination and activity references — and an overlay holds
 * only that locale's prose. Anything an overlay omits keeps its English value,
 * and a mismatched list length fails the build rather than silently dropping a
 * day or a highlight.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["nl", "es", "da", "fi"];

function read(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function expectSameLength(actual, expected, what) {
  if (actual !== expected) throw new Error(`${what}: expected ${expected} entries, got ${actual}`);
}

function buildTours(locale, overlay) {
  const base = read("content/en/tours.json");
  return base.map((tour) => {
    const t = overlay[tour.slug];
    if (!t) throw new Error(`${locale}: tours overlay is missing "${tour.slug}"`);
    expectSameLength(t.highlights.length, tour.highlights.length, `${locale}/${tour.slug} highlights`);
    expectSameLength(t.itinerary.length, tour.itinerary.length, `${locale}/${tour.slug} itinerary`);
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
}

function buildExperiences(locale, overlay) {
  const base = read("content/en/experiences.json");
  return base.map((experience) => {
    const t = overlay[experience.slug];
    if (!t) throw new Error(`${locale}: experiences overlay is missing "${experience.slug}"`);
    expectSameLength(
      t.highlights.length,
      experience.highlights.length,
      `${locale}/${experience.slug} highlights`
    );
    return {
      ...experience,
      title: t.title,
      location: t.location,
      bestTime: t.bestTime,
      duration: t.duration,
      summary: t.summary,
      description: t.description,
      highlights: experience.highlights.map((highlight, i) => ({
        ...highlight,
        name: t.highlights[i].name,
        ...(highlight.note === undefined ? {} : { note: t.highlights[i].note }),
      })),
      _reviewStatus: "needs-native-review",
    };
  });
}

const builders = { tours: buildTours, experiences: buildExperiences };

for (const [file, build] of Object.entries(builders)) {
  for (const locale of locales) {
    const overlayPath = `content/_translations/${file}.${locale}.json`;
    if (!existsSync(join(root, overlayPath))) {
      console.warn(`skipped ${file}/${locale}: no overlay at ${overlayPath}`);
      continue;
    }
    const out = `content/${locale}/${file}.json`;
    writeFileSync(join(root, out), `${JSON.stringify(build(locale, read(overlayPath)), null, 2)}\n`);
    console.log(`wrote ${out}`);
  }
}
