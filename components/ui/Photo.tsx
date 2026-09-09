"use client";

import Image from "next/image";

/**
 * A photograph that might have come from the content files or from the admin
 * page.
 *
 * Content images are files under `public/`, and `next/image` should resize and
 * serve those. Admin images are base64 data URLs stored inline with the
 * itinerary — there is no file for the optimizer to fetch, and pointing it at
 * one throws — so those are rendered as a plain `img`. Both fill their
 * positioned parent, so callers do not have to care which they have.
 */
export function Photo({
  src,
  alt,
  sizes,
  className = "object-cover",
  priority,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} />;
  }

  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
}
