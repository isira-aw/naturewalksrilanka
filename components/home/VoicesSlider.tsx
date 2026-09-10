"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Testimonials } from "@/lib/content/schema";
import { CarouselButton, Kicker, Words } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Traveller quotes as a single large slide rather than a wall of cards — the
 * reference site's testimonial treatment. One quote holds the full width of
 * the column, and the arrows move through them with a directional crossfade.
 */
export function VoicesSlider({
  testimonials,
  labels,
}: {
  testimonials: Testimonials;
  labels: { eyebrow: string; title: string; emptyState: string };
}) {
  const items = testimonials.items;
  const [[index, direction], setSlide] = useState<[number, number]>([0, 1]);

  const move = (step: 1 | -1) => {
    setSlide(([current]) => [(current + step + items.length) % items.length, step]);
  };

  const active = items[index];

  return (
    <section className="bg-stone py-20 md:py-28">
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

          {items.length > 1 && (
            <div className="flex items-center gap-3">
              <CarouselButton direction="prev" label="Previous testimonial" onClick={() => move(-1)} />
              <CarouselButton direction="next" label="Next testimonial" onClick={() => move(1)} />
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="mt-14 max-w-md text-charcoal/60"
          >
            {labels.emptyState}
          </motion.p>
        ) : (
          <div className="mt-14 border-t border-charcoal/15 pt-12">
            <div className="relative min-h-[16rem] md:min-h-[14rem]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.figure
                  key={active.author}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="max-w-4xl"
                >
                  {/* Only reviews left through the review form carry a
                      rating; the hand-written entries in `content/` have
                      none, and inventing one would be a lie. */}
                  {typeof active.rating === "number" && (
                    <p
                      className="mb-5 text-lg tracking-[0.2em] text-forest"
                      aria-label={`${active.rating} out of 5`}
                    >
                      <span aria-hidden="true">
                        {"★".repeat(active.rating)}
                        {"☆".repeat(5 - active.rating)}
                      </span>
                    </p>
                  )}
                  <blockquote className="font-display text-2xl leading-relaxed text-charcoal md:text-[2rem] md:leading-[1.4]">
                    &ldquo;{active.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-8 font-utility text-xs uppercase tracking-[0.2em] text-forest">
                    {active.author}
                    {active.country ? ` · ${active.country}` : ""}
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>

            {items.length > 1 && (
              <div className="mt-10 flex items-center gap-3">
                {items.map((item, i) => (
                  <button
                    key={item.author}
                    type="button"
                    onClick={() => setSlide([i, i > index ? 1 : -1])}
                    aria-label={`Show testimonial ${i + 1} of ${items.length}`}
                    aria-current={i === index}
                    className="group py-3"
                  >
                    <span
                      className={
                        i === index
                          ? "block h-px w-12 bg-forest transition-all duration-500"
                          : "block h-px w-6 bg-charcoal/25 transition-all duration-500 group-hover:bg-charcoal/50"
                      }
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
