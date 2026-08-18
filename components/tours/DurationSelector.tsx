"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { Tour } from "@/lib/content/schema";
import { cn } from "@/lib/utils/cn";

export function DurationSelector({
  tours,
  labels,
}: {
  tours: Tour[];
  labels: { cta: string; daysLabel: string; highlightsTitle: string; custom: string };
}) {
  const [activeSlug, setActiveSlug] = useState(tours[0]?.slug);
  const active = tours.find((t) => t.slug === activeSlug) ?? tours[0];

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {tours.map((tour) => (
          <button
            key={tour.slug}
            type="button"
            onClick={() => setActiveSlug(tour.slug)}
            aria-pressed={tour.slug === activeSlug}
            className={cn(
              "rounded-full border px-6 py-3 font-utility text-sm uppercase tracking-wide transition-colors",
              tour.slug === activeSlug
                ? "border-forest bg-forest text-warm-white"
                : "border-charcoal/20 text-charcoal/70 hover:border-forest hover:text-forest"
            )}
          >
            {tour.durationDays} {labels.daysLabel}
          </button>
        ))}
        <Link
          href="/custom-tour"
          className="rounded-full border border-clay px-6 py-3 font-utility text-sm uppercase tracking-wide text-clay transition-colors hover:bg-clay hover:text-warm-white"
        >
          {labels.custom}
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 grid gap-10 md:grid-cols-2"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm">
              <Image
                src={active.heroImage}
                alt={active.title}
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-display text-2xl text-charcoal md:text-3xl">
                {active.tagline}
              </h3>
              <p className="mt-4 text-charcoal/75">{active.summary}</p>

              <p className="mt-6 font-utility text-xs uppercase tracking-wide text-forest">
                {labels.highlightsTitle}
              </p>
              <ul className="mt-3 space-y-2">
                {active.highlights.slice(0, 4).map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-charcoal/80">
                    <span aria-hidden="true" className="text-forest">
                      —
                    </span>
                    {h}
                  </li>
                ))}
              </ul>

              <Link
                href={`/tours/${active.slug}`}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 font-medium text-warm-white transition-colors hover:bg-forest-dark"
              >
                {labels.cta}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
