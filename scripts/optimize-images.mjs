#!/usr/bin/env node
/**
 * Re-encodes the photographs under `public/images/` and writes the blur
 * placeholder manifest that `components/ui/Photo.tsx` reads.
 *
 * Why both jobs live in one script: the blur for an image has to be taken
 * from the file that actually ships, and doing that in two passes invites the
 * manifest and the files drifting apart. One walk, one output.
 *
 * The sources here are camera originals — 5184x3456 and four megabytes for a
 * photograph that is never displayed wider than about 1600 CSS pixels. Next's
 * optimiser resizes them on the first request for each width, so the cost is
 * paid on a cold cache by a real visitor, and the source has to be decoded in
 * full every time. Shrinking the source is the fix; the optimiser then has
 * far less to do and its output is the same to the eye.
 *
 * Dry run by default, like `migrate-itineraries.mjs`, because re-encoding is
 * lossy and overwrites the only copy in the repository. Read the numbers,
 * then pass `--commit`.
 *
 *   node scripts/optimize-images.mjs            # report only
 *   node scripts/optimize-images.mjs --commit   # rewrite files and manifest
 */

import { createHash } from "node:crypto";
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const IMAGE_DIR = path.join(ROOT, "public", "images");
const MANIFEST = path.join(ROOT, "lib", "images", "blurData.generated.ts");

/** Nothing on the site is displayed wider than this, even full-bleed on a
    large display, once the optimiser has picked a width from `deviceSizes`. */
const MAX_EDGE = 2400;

/**
 * Files already at or under this density are left untouched. Re-encoding a
 * JPEG that has already been through this script would lose a little more
 * detail every run for almost no saving, so the second run has to be a no-op.
 * Roughly 0.20 bytes per pixel is where quality-78 photographs land; anything
 * meaningfully above it has headroom worth taking.
 */
const BYTES_PER_PIXEL_BUDGET = 0.2;

/** Only write when the saving is worth a lossy re-encode. */
const MIN_SAVING = 0.1;

const JPEG = { quality: 78, mozjpeg: true, progressive: true };
const WEBP = { quality: 78 };
const PNG = { compressionLevel: 9, palette: true };

/** The placeholder is stretched over the whole frame and blurred, so it only
    has to carry colour and rough composition. Twelve pixels wide is enough,
    and keeps each entry near a hundred bytes in the client bundle. */
const BLUR_WIDTH = 12;

const RASTER = /\.(jpe?g|png|webp|avif)$/i;

const commit = process.argv.includes("--commit");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** The path the site refers to this file by, which is the manifest's key. */
function publicPath(file) {
  return `/${path.relative(path.join(ROOT, "public"), file).split(path.sep).join("/")}`;
}

function encode(pipeline, format) {
  if (format === "png") return pipeline.png(PNG);
  if (format === "webp") return pipeline.webp(WEBP);
  if (format === "avif") return pipeline.avif({ quality: 55 });
  return pipeline.jpeg(JPEG);
}

async function blurDataUrl(buffer) {
  const blur = await sharp(buffer)
    .resize({ width: BLUR_WIDTH, withoutEnlargement: true })
    .webp({ quality: 40, alphaQuality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${blur.toString("base64")}`;
}

function formatBytes(bytes) {
  if (Math.abs(bytes) < 1024) return `${bytes} B`;
  if (Math.abs(bytes) < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const files = walk(IMAGE_DIR).filter((file) => RASTER.test(file)).sort();

const blur = {};
let before = 0;
let after = 0;
let rewritten = 0;
const skippedNames = [];
const opaquePngs = [];

for (const file of files) {
  const original = readFileSync(file);
  const meta = await sharp(original).metadata();
  before += original.length;

  if (/[^A-Za-z0-9./_-]/.test(publicPath(file))) skippedNames.push(publicPath(file));

  /* A photograph saved as PNG costs three or four times what the same
     photograph costs as JPEG, and PNG only earns that when it carries
     transparency. Changing the format changes the file name, and therefore
     every reference to it, so this is reported rather than done here. */
  if (meta.format === "png" && !meta.hasAlpha) opaquePngs.push(publicPath(file));

  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  const density = original.length / Math.max(1, (meta.width ?? 1) * (meta.height ?? 1));
  const oversized = longest > MAX_EDGE || density > BYTES_PER_PIXEL_BUDGET;

  let output = original;

  if (oversized) {
    let pipeline = sharp(original).rotate();
    if (longest > MAX_EDGE) {
      pipeline = pipeline.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    }
    const candidate = await encode(pipeline, meta.format).toBuffer();

    /* A file that is already efficient can come out larger, especially the
       small PNGs. Keeping the original is the right answer there. */
    if (candidate.length < original.length * (1 - MIN_SAVING)) {
      output = candidate;
      rewritten += 1;
      const dims = longest > MAX_EDGE ? ` ${meta.width}x${meta.height} →  ≤${MAX_EDGE}` : "";
      console.log(
        `${commit ? "rewrite" : "would rewrite"} ${publicPath(file)}` +
          `  ${formatBytes(original.length)} → ${formatBytes(candidate.length)}${dims}`,
      );
    }
  }

  after += output.length;
  blur[publicPath(file)] = await blurDataUrl(output);

  if (commit && output !== original) writeFileSync(file, output);
}

const manifest =
  `/* Generated by \`node scripts/optimize-images.mjs --commit\` — do not edit by hand.\n` +
  ` *\n` +
  ` * One tiny WebP per file under \`public/images/\`, used as the blur placeholder\n` +
  ` * behind the real photograph. See \`lib/images/blur.ts\` for how it is read.\n` +
  ` */\n\n` +
  `export const publicImageBlur: Record<string, string> = {\n` +
  Object.keys(blur)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(blur[key])},\n`)
    .join("") +
  `};\n`;

const manifestChanged =
  !fileExists(MANIFEST) || hash(readFileSync(MANIFEST)) !== hash(Buffer.from(manifest));

if (commit) {
  mkdirSync(path.dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, manifest);
}

console.log("");
console.log(`${files.length} images, ${rewritten} ${commit ? "rewritten" : "to rewrite"}`);
console.log(`${formatBytes(before)} → ${formatBytes(after)} (saves ${formatBytes(before - after)})`);
console.log(
  `blur manifest: ${Object.keys(blur).length} entries, ${formatBytes(Buffer.byteLength(manifest))}` +
    `${manifestChanged ? "" : " (unchanged)"}`,
);

if (opaquePngs.length > 0) {
  console.log("");
  console.log("PNGs with no transparency — convert these to JPEG by hand and update the references:");
  for (const name of opaquePngs) console.log(`  ${name}`);
}

if (skippedNames.length > 0) {
  console.log("");
  console.log("Names with characters that need escaping in a URL — rename these:");
  for (const name of skippedNames) console.log(`  ${name}`);
}

if (!commit) {
  console.log("");
  console.log("Dry run. Nothing was written. Re-run with --commit to apply.");
}

function fileExists(file) {
  try {
    statSync(file);
    return true;
  } catch {
    return false;
  }
}

function hash(buffer) {
  return createHash("sha1").update(buffer).digest("hex");
}
