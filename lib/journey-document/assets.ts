"use client";

/**
 * Turns the public image paths in the content files into something both jsPDF
 * and Word can embed: a decoded canvas for drawing, and a JPEG data URL for
 * the Word file. Everything is re-encoded at a sane size — a document that
 * travels over WhatsApp should not carry 4 MB camera originals.
 */

export type LoadedImage = {
  /** Already decoded, so cropping later is synchronous. */
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
};

const MAX_EDGE = 1400;
const QUALITY = 0.78;

const cache = new Map<string, LoadedImage | null>();

function loadElement(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function encode(src: string): Promise<LoadedImage | null> {
  const element = await loadElement(src);
  if (!element || !element.naturalWidth || !element.naturalHeight) return null;

  const scale = Math.min(1, MAX_EDGE / Math.max(element.naturalWidth, element.naturalHeight));
  const width = Math.max(1, Math.round(element.naturalWidth * scale));
  const height = Math.max(1, Math.round(element.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  // JPEG has no alpha channel: paint the paper colour first, so a PNG with a
  // transparent background does not come out on a black field.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(element, 0, 0, width, height);

  try {
    return { canvas, dataUrl: canvas.toDataURL("image/jpeg", QUALITY), width, height };
  } catch {
    // A tainted canvas (an image served without CORS headers) cannot be read.
    return null;
  }
}

/**
 * Loads every source, keeping going past the ones that fail: content can name
 * a photograph before the file exists (see `public/images/highlights/README.md`),
 * and a document with one picture missing is still worth having.
 */
export async function loadImages(sources: string[]): Promise<Map<string, LoadedImage>> {
  const resolved = new Map<string, LoadedImage>();

  await Promise.all(
    sources.map(async (src) => {
      if (!cache.has(src)) cache.set(src, await encode(src));
      const image = cache.get(src);
      if (image) resolved.set(src, image);
    })
  );

  return resolved;
}

/** Central crop to a target aspect ratio, so no photograph is ever stretched. */
export function cropToAspect(image: LoadedImage, aspect: number): HTMLCanvasElement {
  const sourceAspect = image.width / image.height;
  let sw = image.width;
  let sh = image.height;
  if (sourceAspect > aspect) sw = Math.round(image.height * aspect);
  else sh = Math.round(image.width / aspect);

  if (sw === image.width && sh === image.height) return image.canvas;

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  if (!context) return image.canvas;
  context.drawImage(
    image.canvas,
    Math.round((image.width - sw) / 2),
    Math.round((image.height - sh) / 2),
    sw,
    sh,
    0,
    0,
    sw,
    sh
  );
  return canvas;
}

/**
 * A copy of the picture under a flat wash of colour. Word cannot dim a cell's
 * background image, so a photograph destined to sit behind text is dimmed here
 * instead — which is also what keeps the same page readable in the PDF.
 */
export function tinted(source: HTMLCanvasElement, color: string, alpha: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(source, 0, 0);
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function toDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/jpeg", 0.78);
}

/** Hands a finished file to the browser's downloader. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
