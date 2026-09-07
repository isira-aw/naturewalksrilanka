"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { Tour } from "@/lib/content/schema";
import { cn } from "@/lib/utils/cn";
import { ArrowLink, Kicker, Rise, Words } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The journeys block: a row of duration filters over one large panel, the way
 * the reference site filters its itineraries. Switching a filter crossfades
 * the panel — photograph, summary and highlights together — while the active
 * pill slides between buttons as a single shared element.
 */
export function JourneyShowcase({
  tours,
  labels,
}: {
  tours: Tour[];
  labels: {
    eyebrow: string;
    title: string;
    cta: string;
    daysLabel: string;
    highlightsTitle: string;
    custom: string;
    allCta: string;
  };
}) {
  const [activeSlug, setActiveSlug] = useState(tours[0]?.slug);
  const active = tours.find((t) => t.slug === activeSlug) ?? tours[0];

  return (
    <section className="bg-warm-white py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="max-w-2xl">
          <Kicker>{labels.eyebrow}</Kicker>
          <Words
            text={labels.title}
            delay={0.05}
            className="mt-6 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
          />
        </div>

        <Rise delay={0.15} className="mt-10">
          <div className="flex flex-wrap gap-3">
            {tours.map((tour) => {
              const isActive = tour.slug === activeSlug;
              return (
                <button
                  key={tour.slug}
                  type="button"
                  onClick={() => setActiveSlug(tour.slug)}
                  aria-pressed={isActive}
                  className={cn(
                    "relative rounded-full px-6 py-3 font-utility text-sm uppercase tracking-wide transition-colors duration-300",
                    isActive ? "text-warm-white" : "text-charcoal/70 hover:text-forest"
                  )}
                >
                  {/* One pill, shared across buttons: it slides to whichever
                      duration you pick rather than blinking on and off. */}
                  {isActive && (
                    <motion.span
                      layoutId="journey-pill"
                      transition={{ duration: 0.5, ease: EASE }}
                      className="absolute inset-0 rounded-full bg-forest"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 rounded-full border transition-colors duration-300",
                      isActive ? "border-transparent" : "border-charcoal/20"
                    )}
                  />
                  <span className="relative">
                    {tour.durationDays} {labels.daysLabel}
                  </span>
                </button>
              );
            })}
            <Link
              href="/custom-tour"
              className="rounded-full border border-clay px-6 py-3 font-utility text-sm uppercase tracking-wide text-clay transition-colors duration-300 hover:bg-clay hover:text-warm-white"
            >
              {labels.custom}
            </Link>
          </div>
        </Rise>

        <div className="mt-12">
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active.slug}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="grid gap-10 md:grid-cols-12 md:gap-14"
              >
                <div className="group relative aspect-[4/3] w-full overflow-hidden md:col-span-7 md:aspect-[16/11]">
                  <motion.div
                    key={`${active.slug}-image`}
                    initial={{ scale: 1.08 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.4, ease: EASE }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={active.heroImage}
                      alt={active.title}
                      fill
                      sizes="(min-width: 768px) 55vw, 100vw"
                      className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  </motion.div>
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-charcoal/70 to-transparent" />
                  <p className="absolute bottom-6 left-6 font-utility text-xs uppercase tracking-[0.2em] text-warm-white/85">
                    {active.durationDays} {labels.daysLabel}
                  </p>
                </div>

                <div className="md:col-span-5">
                  <h3 className="font-display text-2xl leading-tight text-charcoal md:text-3xl">
                    {active.tagline}
                  </h3>
                  <p className="mt-5 leading-relaxed text-charcoal/75">{active.summary}</p>

                  <p className="mt-9 font-utility text-xs uppercase tracking-[0.2em] text-forest">
                    {labels.highlightsTitle}
                  </p>
                  <ul className="mt-4 border-t border-charcoal/15">
                    {active.highlights.slice(0, 4).map((h, i) => (
                      <motion.li
                        key={h}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.07 }}
                        className="border-b border-charcoal/15 py-3 text-sm text-charcoal/80"
                      >
                        {h}
                      </motion.li>
                    ))}
                  </ul>

                  <Link
                    href={`/tours/${active.slug}`}
                    className="group relative mt-9 inline-flex items-center gap-3 overflow-hidden rounded-full border border-forest px-7 py-3.5 font-medium text-forest transition-colors duration-500 hover:text-warm-white"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 translate-y-full bg-forest transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
                    />
                    <span className="relative">{labels.cta}</span>
                    <span
                      aria-hidden="true"
                      className="relative transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5"
                    >
                      &#8594;
                    </span>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Rise delay={0.1}>
          <ArrowLink href="/tours" className="mt-14">
            {labels.allCta}
          </ArrowLink>
        </Rise>
      </div>
    </section>
  );
}
