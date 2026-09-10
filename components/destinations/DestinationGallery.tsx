"use client";

import { Photo } from "@/components/ui/Photo";
import { motion, useTransform } from "framer-motion";
import type { DestinationImage } from "@/lib/content/schema";
import { CarouselButton, Kicker, viewport } from "@/components/ui/motion";
import { useRail } from "@/components/ui/useRail";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The destination's own photographs, as a rail you push through. Only frames
 * whose file actually exists reach this component (see lib/content/images.ts),
 * so an unphotographed destination shows no empty gallery at all.
 */
export function DestinationGallery({
  images,
  eyebrow,
}: {
  images: DestinationImage[];
  eyebrow: string;
}) {
  const { ref, progress, canPrev, canNext, scrollByCard } = useRail();
  const scaleX = useTransform(progress, [0, 1], [0.08, 1]);

  if (images.length === 0) return null;

  return (
    <section className="overflow-hidden bg-stone py-16 md:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Kicker>{eyebrow}</Kicker>
          <div className="hidden items-center gap-3 md:flex">
            <CarouselButton
              direction="prev"
              label="Previous photograph"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
            />
            <CarouselButton
              direction="next"
              label="Next photograph"
              disabled={!canNext}
              onClick={() => scrollByCard(1)}
            />
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] ps-[max(1rem,calc((100%-80rem)/2+1rem))] pe-4 scroll-ps-[max(1rem,calc((100%-80rem)/2+1rem))] sm:ps-[max(1.5rem,calc((100%-80rem)/2+1.5rem))] sm:scroll-ps-[max(1.5rem,calc((100%-80rem)/2+1.5rem))] md:ps-[max(2.5rem,calc((100%-80rem)/2+2.5rem))] md:scroll-ps-[max(2.5rem,calc((100%-80rem)/2+2.5rem))] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => (
          <motion.figure
            key={image.src}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.8, ease: EASE, delay: (index % 3) * 0.08 }}
            className="group w-[82vw] shrink-0 snap-start sm:w-[56vw] lg:w-[38rem]"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Photo
                src={image.src}
                alt={image.alt}
                sizes="(min-width: 1024px) 38rem, (min-width: 640px) 56vw, 82vw"
                className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
              />
            </div>
            {image.caption && (
              <figcaption className="mt-4 max-w-md text-sm leading-relaxed text-charcoal/60">
                {image.caption}
              </figcaption>
            )}
          </motion.figure>
        ))}
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="mt-6 h-px w-full bg-charcoal/10 md:max-w-sm">
          <motion.span className="block h-px origin-left bg-forest" style={{ scaleX }} />
        </div>
      </div>
    </section>
  );
}
