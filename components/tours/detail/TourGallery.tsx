"use client";

import { useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { Container } from "@/components/ui/Container";
import { Lightbox, type LightboxLabels } from "@/components/ui/Lightbox";
import type { TourGalleryImage } from "@/lib/content/tourGallery";

/**
 * The bird photography, as an editorial mosaic rather than an even grid — two
 * frames across the top, three beneath, and one full-width to close on. On a
 * phone it collapses to two columns with the last frame spanning both, so the
 * rhythm survives without any frame becoming a postage stamp.
 *
 * Each frame opens in the shared lightbox, because a Sri Lanka Blue Magpie in
 * a 300 px box is not worth having photographed.
 */

/* Column span and height per position, in the order the mosaic reads. Held
   as data so the markup below stays one loop. */
const FRAMES = [
  "md:col-span-7 h-64 md:h-[27rem]",
  "md:col-span-5 h-64 md:h-[27rem]",
  "md:col-span-4 h-64 md:h-[19.5rem]",
  "md:col-span-4 h-64 md:h-[19.5rem]",
  "md:col-span-4 h-64 md:h-[19.5rem]",
  "col-span-2 md:col-span-12 h-64 md:h-[32rem]",
];

const SIZES = [
  "(min-width: 768px) 58vw, 50vw",
  "(min-width: 768px) 42vw, 50vw",
  "(min-width: 768px) 33vw, 50vw",
  "(min-width: 768px) 33vw, 50vw",
  "(min-width: 768px) 33vw, 50vw",
  "100vw",
];

export function TourGallery({
  images,
  labels,
}: {
  images: TourGalleryImage[];
  labels: { eyebrow: string; title: string; lead: string; lightbox: LightboxLabels };
}) {
  const [open, setOpen] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section id="gallery" className="scroll-mt-24 bg-warm-white py-20 md:py-24">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
          <div>
            <p className="font-utility text-[11px] uppercase tracking-[0.22em] text-muted">
              {labels.eyebrow}
            </p>
            <h2 className="mt-4 font-display text-3xl leading-[1.05] tracking-[-0.03em] text-ink md:text-[2.75rem]">
              {labels.title}
            </h2>
          </div>
          <p className="max-w-md text-ink/70">{labels.lead}</p>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-3.5">
          {images.map((image, index) => (
            <figure
              key={image.src}
              className={`group relative m-0 overflow-hidden rounded-2xl bg-stone ${
                FRAMES[index % FRAMES.length]
              }`}
            >
              <Photo
                src={image.src}
                alt={image.name}
                sizes={SIZES[index % SIZES.length]}
                className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
              />
              <button
                type="button"
                onClick={() => setOpen(index)}
                className="absolute inset-0 h-full w-full cursor-zoom-in"
              >
                <span className="sr-only">{image.name}</span>
              </button>
            </figure>
          ))}
        </div>
      </Container>

      <Lightbox
        images={images.map((image) => ({ src: image.src, title: image.name }))}
        index={open}
        labels={labels.lightbox}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
      />
    </section>
  );
}
