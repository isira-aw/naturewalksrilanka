"use client";

import Image from "next/image";
import { motion, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { Destination } from "@/lib/content/schema";
import { ArrowLabel, CarouselButton, Kicker, Rise, Words, viewport } from "./primitives";
import { useRail } from "./useRail";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Sri Lanka as a rail of tall portrait cards — the reference site's island
 * row. Every destination currently shares one placeholder photograph (see
 * lib/content/imageMap.ts); each card already reads its own `image`, so the
 * row differentiates itself the moment real per-destination photography lands.
 */
export function DestinationRail({
  destinations,
  labels,
}: {
  destinations: Destination[];
  labels: { eyebrow: string; title: string; body: string; cta: string };
}) {
  const { ref, progress, canPrev, canNext, scrollByCard } = useRail();
  // Never fully empty: a sliver of the bar shows the rail exists at all.
  const scaleX = useTransform(progress, [0, 1], [0.08, 1]);

  return (
    <section className="overflow-hidden bg-stone py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Kicker>{labels.eyebrow}</Kicker>
            <Words
              text={labels.title}
              delay={0.05}
              className="mt-6 max-w-xl font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
            />
          </div>

          <div className="md:col-span-5 md:pt-3">
            <Rise delay={0.15}>
              <p className="leading-relaxed text-charcoal/70">{labels.body}</p>
            </Rise>
            <Rise delay={0.22}>
              <div className="mt-8 hidden items-center gap-3 md:flex">
                <CarouselButton
                  direction="prev"
                  label="Previous destinations"
                  disabled={!canPrev}
                  onClick={() => scrollByCard(-1)}
                />
                <CarouselButton
                  direction="next"
                  label="Next destinations"
                  disabled={!canNext}
                  onClick={() => scrollByCard(1)}
                />
              </div>
            </Rise>
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] ps-[max(1rem,calc((100%-80rem)/2+1rem))] pe-4 scroll-ps-[max(1rem,calc((100%-80rem)/2+1rem))] sm:ps-[max(1.5rem,calc((100%-80rem)/2+1.5rem))] sm:scroll-ps-[max(1.5rem,calc((100%-80rem)/2+1.5rem))] md:ps-[max(2.5rem,calc((100%-80rem)/2+2.5rem))] md:scroll-ps-[max(2.5rem,calc((100%-80rem)/2+2.5rem))] [&::-webkit-scrollbar]:hidden"
      >
        {destinations.map((destination, index) => (
          <motion.article
            key={destination.slug}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.8, ease: EASE, delay: (index % 4) * 0.08 }}
            className="w-[76vw] shrink-0 snap-start sm:w-[46vw] md:w-[30vw] lg:w-[22rem]"
          >
            <Link href={`/destinations/${destination.slug}`} className="group block">
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src={destination.image}
                  alt={destination.name}
                  fill
                  sizes="(min-width: 1024px) 22rem, (min-width: 768px) 30vw, 76vw"
                  className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
                {/* A forest wash that rises over the photograph on hover. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 translate-y-full bg-forest/35 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
                />

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-warm-white/70">
                    {destination.region}
                  </p>
                  <h3 className="mt-2 font-display text-xl text-warm-white">{destination.name}</h3>
                  <span className="mt-4 flex h-9 w-9 items-center justify-center rounded-full border border-warm-white/40 text-warm-white opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100">
                    <span aria-hidden="true">&#8594;</span>
                  </span>
                </div>
              </div>
            </Link>
          </motion.article>
        ))}

        {/* The rail ends on the same invitation the cards lead to. */}
        <div className="flex w-[60vw] shrink-0 snap-start items-center sm:w-[36vw] md:w-[24vw] lg:w-[18rem]">
          <Link
            href="/destinations"
            className="group inline-flex items-center gap-3 font-utility text-xs uppercase tracking-[0.2em] text-forest transition-colors hover:text-forest-dark"
          >
            <ArrowLabel>{labels.cta}</ArrowLabel>
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="mt-6 h-px w-full bg-charcoal/10 md:max-w-sm">
          <motion.span
            className="block h-px origin-left bg-forest"
            style={{ scaleX }}
          />
        </div>
      </div>
    </section>
  );
}
