"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ItineraryDay as ItineraryDayType } from "@/lib/content/schema";
import { cn } from "@/lib/utils/cn";
import { viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One day of a journey, as a row on a hairline rail: the day number set in the
 * margin, the place as the heading, and the detail opening in place. No icon
 * marks the open state — the rule under the row extends and the plus rotates,
 * which is the whole vocabulary the site uses for expanding things.
 */
export function ItineraryDay({
  day,
  isLast,
  defaultOpen = false,
  contentRequiredLabel,
  index,
}: {
  day: ItineraryDayType;
  isLast?: boolean;
  defaultOpen?: boolean;
  contentRequiredLabel: string;
  index: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `itinerary-day-${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.7, ease: EASE }}
      className={cn("relative border-t border-charcoal/15", isLast && "border-b")}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((o) => !o)}
        className="group grid w-full gap-2 py-6 text-left md:grid-cols-12 md:items-baseline md:gap-8"
      >
        <span className="font-utility text-xs uppercase tracking-[0.2em] text-forest md:col-span-2">
          {day.day}
        </span>

        <span className="font-display text-xl text-charcoal transition-colors duration-500 group-hover:text-forest md:col-span-6 md:text-2xl">
          {day.location}
        </span>

        <span className="flex items-center justify-between gap-4 md:col-span-4">
          <span className="text-sm leading-relaxed text-charcoal/60">{day.title}</span>
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0 font-utility text-lg leading-none text-forest transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              open && "rotate-45"
            )}
          >
            +
          </span>
        </span>
      </button>

      <div
        id={contentId}
        role="region"
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0">
          <div className="grid gap-6 pb-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-8 md:col-start-3">
              {day.contentRequired && (
                <p className="mb-4 inline-flex items-center border border-clay/40 bg-clay/10 px-3 py-1 font-utility text-[11px] uppercase tracking-[0.15em] text-clay">
                  {day.note ?? contentRequiredLabel}
                </p>
              )}
              <p className="leading-relaxed text-charcoal/75">{day.description}</p>

              {day.highlights && day.highlights.length > 0 && (
                <ul className="mt-6 border-t border-charcoal/15">
                  {day.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="border-b border-charcoal/15 py-3 text-sm leading-relaxed text-charcoal/70"
                    >
                      {highlight}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
