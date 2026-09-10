"use client";

import Image from "next/image";
import { blurFor } from "@/lib/images/blur";

/**
 * A photograph that might have come from the content files, from Firebase
 * Storage, or from the admin page.
 *
 * Content images are files under `public/`, and `next/image` should resize and
 * serve those. Admin images are base64 data URLs stored inline with the
 * itinerary — there is no file for the optimizer to fetch, and pointing it at
 * one throws — so those are rendered as a plain `img`. Both fill their
 * positioned parent, so callers do not have to care which they have.
 *
 * Every image on the site goes through here so the blur placeholder is
 * decided in one place. A photograph that arrives on a slow connection
 * otherwise leaves a hole in the layout, and these pages are mostly
 * full-bleed photography — the hole is the page. The placeholder for a file
 * under `public/` is looked up by path; a Storage URL carries its own, taken
 * when it was uploaded, and is passed in.
 */
export function Photo({
  src,
  alt,
  sizes,
  className = "object-cover",
  priority,
  blurDataURL,
  "aria-hidden": ariaHidden,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /** For images the manifest cannot know about — anything not under `public/`. */
  blurDataURL?: string;
  /** For decorative frames in a sequence, so a screen reader is not read each one. */
  "aria-hidden"?: boolean;
}) {
  if (src.startsWith("data:")) {
    /* Already inline, so it is on screen the moment the markup is: a
       placeholder would only add a frame of blur before it. */
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        aria-hidden={ariaHidden}
        className={`absolute inset-0 h-full w-full ${className}`}
      />
    );
  }

  const blur = blurDataURL ?? blurFor(src);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      aria-hidden={ariaHidden}
      className={className}
      /* Both props or neither: `placeholder="blur"` without a data URL throws
         for a non-static import. */
      {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
    />
  );
}
