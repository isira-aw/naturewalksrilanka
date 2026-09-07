"use client";

import { motion, useTransform } from "framer-motion";
import { CarouselButton, Kicker, Words, viewport } from "@/components/ui/motion";
import { useRail } from "@/components/ui/useRail";

export type Service = { title: string; short: string };

/**
 * What the company itself arranges, as a horizontal rail of numbered cards —
 * the reference site's "row you push through" pattern. The heading sits on the
 * left with the slider chrome opposite it, and the rail runs to the edge of
 * the screen so the next card is always half-visible.
 *
 * No iconography anywhere: the numbering and the rules carry the structure,
 * which is how the reference site handles a row like this.
 */
const EASE = [0.16, 1, 0.3, 1] as const;

export function ServiceRail({
  labels,
  services,
}: {
  labels: { eyebrow: string; title: string };
  services: Service[];
}) {
  const { ref, progress, canPrev, canNext, scrollByCard } = useRail();
  // Never fully empty: a sliver of the bar shows the rail exists at all.
  const scaleX = useTransform(progress, [0, 1], [0.08, 1]);

  return (
    <section className="overflow-hidden bg-warm-white py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <Kicker>{labels.eyebrow}</Kicker>
            <Words
              text={labels.title}
              delay={0.05}
              className="mt-6 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
            />
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <CarouselButton
              direction="prev"
              label="Previous services"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
            />
            <CarouselButton
              direction="next"
              label="Next services"
              disabled={!canNext}
              onClick={() => scrollByCard(1)}
            />
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] ps-[max(1rem,calc((100%-80rem)/2+1rem))] pe-4 scroll-ps-[max(1rem,calc((100%-80rem)/2+1rem))] sm:ps-[max(1.5rem,calc((100%-80rem)/2+1.5rem))] sm:scroll-ps-[max(1.5rem,calc((100%-80rem)/2+1.5rem))] md:ps-[max(2.5rem,calc((100%-80rem)/2+2.5rem))] md:scroll-ps-[max(2.5rem,calc((100%-80rem)/2+2.5rem))] [&::-webkit-scrollbar]:hidden"
      >
        {services.map((service, index) => (
          <motion.article
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.8, ease: EASE, delay: index * 0.09 }}
            className="group relative w-[78vw] shrink-0 snap-start sm:w-[52vw] md:w-[30vw] lg:w-[22.5rem]"
          >
            <div className="relative h-full overflow-hidden border-t border-charcoal/15 pt-8">
              {/* The rule above the card redraws in forest on hover, left to
                  right — the reference site's card "arming" gesture. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-forest transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
              />

              <p className="font-utility text-xs uppercase tracking-[0.25em] text-charcoal/35 transition-colors duration-500 group-hover:text-forest">
                {String(index + 1).padStart(2, "0")}
              </p>

              <h3 className="mt-8 font-display text-2xl text-charcoal">{service.title}</h3>
              <p className="mt-3 leading-relaxed text-charcoal/65">{service.short}</p>
            </div>
          </motion.article>
        ))}
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
