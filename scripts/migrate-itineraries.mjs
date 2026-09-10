/**
 * Moves itineraries from the Vercel Blob archive into Firestore, and their
 * embedded base64 images into Firebase Storage.
 *
 *   node --env-file=.env scripts/migrate-itineraries.mjs            # dry run
 *   node --env-file=.env scripts/migrate-itineraries.mjs --commit   # for real
 *
 * A dry run is the default, and that is deliberate: this is the one
 * irreversible-feeling step in the migration, and being able to see exactly
 * what it would do — how many records, how many images, how many megabytes
 * of base64 turned into files — before anything is written is worth the
 * extra command.
 *
 * It **never deletes the blob archive.** Keep it until the Firestore data has
 * been checked in the admin panel; deleting it is a separate, deliberate act.
 *
 * Re-running is safe. Images that are already https URLs are left alone, so
 * a run interrupted halfway can simply be repeated.
 */

import { head } from "@vercel/blob";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const commit = process.argv.includes("--commit");
const BLOB_PATH = "itineraries/archive.json";

const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_STORAGE_BUCKET",
  "BLOB_READ_WRITE_TOKEN",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const rawKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = (
  rawKey.startsWith('"') && rawKey.endsWith('"') ? rawKey.slice(1, -1) : rawKey
).replace(/\\n/g, "\n");

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

/* ---- read the existing archive ---------------------------------------- */

let archive;
try {
  const { url } = await head(BLOB_PATH);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  archive = await response.json();
} catch (error) {
  console.error(`Could not read ${BLOB_PATH}: ${error.message}`);
  console.error("If the archive was already removed, there is nothing to migrate.");
  process.exit(1);
}

const records = Array.isArray(archive?.records) ? archive.records : [];
if (records.length === 0) {
  console.log("The archive holds no records. Nothing to do.");
  process.exit(0);
}

console.log(`${commit ? "MIGRATING" : "DRY RUN —"} ${records.length} itineraries.\n`);

/* ---- helpers ----------------------------------------------------------- */

const DATA_URL = /^data:(image\/[a-z+]+);base64,(.+)$/i;

const stats = { records: 0, images: 0, bytesInlined: 0, skipped: 0, alreadyUrls: 0 };

/**
 * Uploads one base64 image and returns a stable public download URL.
 *
 * The URL form matters: a signed URL would expire and quietly break the page
 * weeks later, and the `storage.googleapis.com` form is not in the
 * `remotePatterns` allowlist in next.config.ts. A download token gives a
 * permanent `firebasestorage.googleapis.com` URL, which is what the config
 * expects and what `next/image` will accept.
 */
async function uploadImage(dataUrl, storagePath) {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return null;

  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  stats.bytesInlined += buffer.byteLength;

  if (!commit) {
    stats.images += 1;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=DRY-RUN`;
  }

  const token = randomUUID();
  await bucket.file(storagePath).save(buffer, {
    contentType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    resumable: false,
  });

  stats.images += 1;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

/**
 * A blur placeholder for an image that is about to be uploaded.
 *
 * New photographs get theirs in the browser at upload time, and the files
 * under `public/` get theirs from `scripts/optimize-images.mjs`. Records that
 * predate both are only ever seen here, so this is the one chance to give
 * them one. Twelve pixels wide, to match those two.
 *
 * Never throws. A record whose placeholder could not be made should still
 * migrate — losing a decoration is not worth failing the move over.
 */
async function blurFor(dataUrl) {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return undefined;
  try {
    const blur = await sharp(Buffer.from(match[2], "base64"))
      .resize({ width: 12, withoutEnlargement: true })
      .webp({ quality: 40 })
      .toBuffer();
    return `data:image/webp;base64,${blur.toString("base64")}`;
  } catch (error) {
    console.warn(`  could not make a blur placeholder: ${error.message}`);
    return undefined;
  }
}

/**
 * Leaves anything that is already a URL or a `public/` path untouched.
 *
 * Returns the new source and, for an image that was uploaded, its blur
 * placeholder. An image that was already a URL gets none: the bytes are in
 * Storage and downloading each one back to shrink it is not worth it — those
 * records keep behaving exactly as they do today.
 */
async function convert(image, storagePath) {
  if (typeof image !== "string" || image === "") return { src: image };
  if (!image.startsWith("data:")) {
    stats.alreadyUrls += 1;
    return { src: image };
  }
  const blur = await blurFor(image);
  const url = await uploadImage(image, storagePath);
  return url ? { src: url, blur } : { src: image };
}

const extensionFor = (dataUrl) => {
  const match = DATA_URL.exec(dataUrl ?? "");
  if (!match) return "jpg";
  const subtype = match[1].split("/")[1];
  return subtype === "jpeg" ? "jpg" : subtype;
};

/* ---- migrate ----------------------------------------------------------- */

for (const record of records) {
  if (!record?.id) {
    console.warn("Skipping a record with no id.");
    stats.skipped += 1;
    continue;
  }

  /* Keyed by URL, so it covers the highlight photographs from the same map —
     see `imageBlur` in lib/itineraries/types.ts. */
  const imageBlur = { ...(record.imageBlur ?? {}) };
  const remember = ({ src, blur }) => {
    if (blur) imageBlur[src] = blur;
    return src;
  };

  const images = [];
  for (const [index, image] of (record.images ?? []).entries()) {
    const path = `itineraries/${record.id}/image-${index}.${extensionFor(image)}`;
    images.push(remember(await convert(image, path)));
  }

  const highlights = [];
  for (const [index, highlight] of (record.highlights ?? []).entries()) {
    const path = `itineraries/${record.id}/highlight-${index}.${extensionFor(highlight?.image)}`;
    highlights.push({ ...highlight, image: remember(await convert(highlight?.image, path)) });
  }

  const next = { ...record, images, highlights, imageBlur };

  if (commit) {
    await db.collection("itineraries").doc(record.id).set(next);
  }

  stats.records += 1;
  console.log(`  ${commit ? "wrote" : "would write"} ${record.slug || record.id}`);
}

/* ---- report ------------------------------------------------------------ */

const mb = (stats.bytesInlined / (1024 * 1024)).toFixed(2);
console.log(`
${commit ? "Migrated" : "Would migrate"}:
  itineraries        ${stats.records}
  images uploaded    ${stats.images} (${mb} MB previously inlined as base64)
  already URLs       ${stats.alreadyUrls}
  skipped            ${stats.skipped}
`);

if (!commit) {
  console.log("Dry run — nothing was written. Re-run with --commit to apply.");
} else {
  console.log("Done. The blob archive was NOT deleted.");
  console.log("Check the admin panel and the custom-tour page, then remove it by hand.");
}

process.exit(0);
