"use client";

/**
 * Turns a chosen file into a base64 data URL small enough to keep.
 *
 * Everything an admin adds is stored inline with the record rather than
 * uploaded, so a 6 MB camera original would eat the whole browser storage
 * quota on its own — and would still have to be re-encoded before it could go
 * into a PDF. Re-encoding here, once, at a sensible size, is what keeps both
 * workable.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

/* Wide enough to carry colour and rough composition once it is stretched over
   the frame and blurred, small enough that storing one per photograph on the
   itinerary costs nothing worth counting. Matches the width
   `scripts/optimize-images.mjs` uses for the files under `public/`. */
const BLUR_EDGE = 12;
const BLUR_QUALITY = 0.5;

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }

  const source = await readAsDataUrl(file);
  const image = await decode(source);

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return source;

  // JPEG has no alpha: paint the paper colour first so a transparent PNG does
  // not come out on black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", QUALITY);
}

/**
 * A blur placeholder for an image that is about to be uploaded.
 *
 * Files under `public/` get theirs from `scripts/optimize-images.mjs` at build
 * time. A photograph an admin uploads has no such moment — it does not exist
 * until the browser sends it — so it is taken here, from the same canvas the
 * re-encode already uses, and stored on the itinerary alongside the URL.
 *
 * Returns `undefined` rather than throwing: a missing placeholder shows the
 * photograph exactly as it does today, and losing the save over a decoration
 * would be a poor trade.
 */
export async function dataUrlToBlur(dataUrl: string): Promise<string | undefined> {
  try {
    const image = await decode(dataUrl);
    const scale = Math.min(1, BLUR_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", BLUR_QUALITY);
  } catch {
    return undefined;
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function decode(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That file could not be decoded as an image."));
    image.src = src;
  });
}

/** Roughly how much storage a data URL costs, for the quota warning. */
export function approximateBytes(dataUrl: string) {
  const commaAt = dataUrl.indexOf(",");
  const payload = commaAt >= 0 ? dataUrl.length - commaAt - 1 : dataUrl.length;
  return Math.round(payload * 0.75);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
