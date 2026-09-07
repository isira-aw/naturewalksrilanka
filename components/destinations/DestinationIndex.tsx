"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { Destination } from "@/lib/content/schema";
import { cn } from "@/lib/utils/cn";
import { viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Every destination, filterable by region — the reference site's way into a
 * long list of places. The filter row uses one shared pill that slides between
 * regions, and the grid re-lays itself out with a layout animation rather than
 * snapping, so filtering reads as the same cards moving.
 */
export function DestinationIndex({
  destinations,
  labels,
}: {
  destinations: Destination[];
  labels: { all: string; count: string };
}) {
  const regions = useMemo(
    () => Array.from(new Set(destinations.map((d) => d.region))).sort(),
    [destinations]
  );
  const [region, setRegion] = useState<string | null>(null);
  const shown = region ? destinations.filter((d) => d.region === region) : destinations;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={region === null} onClick={() => setRegion(null)}>
          {labels.all}
        </FilterPill>
        {regions.map((r) => (
          <FilterPill key={r} active={region === r} onClick={() => setRegion(r)}>
            {r}
          </FilterPill>
        ))}
      </div>

      <p className="mt-8 font-utility text-xs uppercase tracking-[0.2em] text-charcoal/45">
        {shown.length} {labels.count}
      </p>

      <motion.ul layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((destination, index) => (
            <motion.li
              key={destination.slug}
              layout
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              viewport={viewport}
              transition={{ duration: 0.7, ease: EASE, delay: (index % 3) * 0.06 }}
            >
              <Link href={`/destinations/${destination.slug}`} className="group block">
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/15 to-transparent" />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 translate-y-full bg-forest/35 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-warm-white/70">
                      {destination.region}
                    </p>
                    <h2 className="mt-2 font-display text-2xl text-warm-white">
                      {destination.name}
                    </h2>
                    {/* The one-line summary unrolls on hover rather than
                        sitting under every card and crowding the grid. */}
                    <p className="mt-3 max-h-0 overflow-hidden text-sm leading-relaxed text-warm-white/0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:max-h-40 group-hover:text-warm-white/85">
                      {destination.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative rounded-full px-5 py-2.5 font-utility text-xs uppercase tracking-[0.15em] transition-colors duration-300",
        active ? "text-warm-white" : "text-charcoal/60 hover:text-forest"
      )}
    >
      {active && (
        <motion.span
          layoutId="region-pill"
          transition={{ duration: 0.5, ease: EASE }}
          className="absolute inset-0 rounded-full bg-forest"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full border transition-colors duration-300",
          active ? "border-transparent" : "border-charcoal/15"
        )}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
