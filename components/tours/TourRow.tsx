"use client";

import { Photo } from "@/components/ui/Photo";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { Tour } from "@/lib/content/schema";
import { cn } from "@/lib/utils/cn";
import { ArrowLabel, viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One journey, as a full-width editorial row: photograph on one side, the
 * duration set large over it, and the highlights as a plain ruled list. Rows
 * alternate sides down the page, which is how the reference site paces a list
 * of long items without it becoming a card grid.
 */
export function TourRow({
  tour,
  index,
  labels,
}: {
  tour: Tour;
  index: number;
  labels: { cta: string; daysLabel: string; highlightsTitle: string };
}) {
  const flipped = index % 2 === 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.9, ease: EASE }}
      className="border-t border-charcoal/15 py-12 first:border-t-0 first:pt-0 md:py-16"
    >
      <Link href={`/tours/${tour.slug}`} className="group grid gap-8 md:grid-cols-12 md:gap-14">
        <div
          className={cn(
            "relative aspect-[4/3] w-full overflow-hidden md:col-span-7",
            flipped && "md:order-2"
          )}
        >
          <Photo
            src={tour.heroImage}
            alt={tour.title}
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 to-transparent" />
          <span
            aria-hidden="true"
            className="absolute inset-0 translate-y-full bg-forest/30 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
          />
          <p className="absolute bottom-6 left-6 font-display text-4xl leading-none text-warm-white md:text-5xl">
            {tour.durationDays}
            <span className="ms-2 align-middle font-utility text-xs uppercase tracking-[0.2em]">
              {labels.daysLabel}
            </span>
          </p>
        </div>

        <div className={cn("md:col-span-5 md:self-center", flipped && "md:order-1")}>
          <h2 className="font-display text-2xl leading-tight text-charcoal transition-colors duration-500 group-hover:text-forest md:text-3xl">
            {tour.title}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-charcoal/70">{tour.tagline}</p>

          <p className="mt-8 font-utility text-xs uppercase tracking-[0.2em] text-forest">
            {labels.highlightsTitle}
          </p>
          <ul className="mt-4 border-t border-charcoal/15">
            {tour.highlights.slice(0, 3).map((highlight) => (
              <li
                key={highlight}
                className="border-b border-charcoal/15 py-3 text-sm leading-relaxed text-charcoal/75"
              >
                {highlight}
              </li>
            ))}
          </ul>

          <span className="mt-8 inline-flex items-center gap-3 font-utility text-xs uppercase tracking-[0.2em] text-forest">
            <ArrowLabel>{labels.cta}</ArrowLabel>
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
