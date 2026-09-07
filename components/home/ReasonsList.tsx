"use client";

import { motion } from "framer-motion";
import { Kicker, Rise, Words, viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The credibility block, built as the reference site builds its editorial
 * lists: numbered full-width rows separated by hairlines that draw themselves
 * in, each row warming into forest on hover — no icons, the numbering and the
 * rules do that work. Closed by the conservation note that explains where the
 * guiding came from.
 */
export function ReasonsList({
  labels,
  points,
}: {
  labels: { eyebrow: string; title: string; note: string };
  points: { title: string; description: string }[];
}) {
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

        <ul className="mt-14">
          {points.map((point, index) => (
            <motion.li
              key={point.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.8, ease: EASE, delay: index * 0.1 }}
              className="group relative"
            >
              <motion.span
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={viewport}
                transition={{ duration: 1, ease: EASE, delay: index * 0.1 }}
                className="block h-px w-full origin-left bg-charcoal/15"
              />

              <div className="relative grid gap-4 py-8 md:grid-cols-12 md:items-baseline md:gap-8 md:py-10">
                {/* A forest field that wipes in behind the row on hover, the
                    way the reference site warms its list rows. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-[-1rem] inset-y-0 origin-left scale-x-0 bg-forest/[0.04] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 md:inset-x-[-2rem]"
                />

                <p className="relative font-utility text-xs uppercase tracking-[0.2em] text-charcoal/35 transition-colors duration-500 group-hover:text-forest md:col-span-1">
                  {String(index + 1).padStart(2, "0")}
                </p>

                <h3 className="relative font-display text-xl text-charcoal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 md:col-span-5 md:text-2xl">
                  {point.title}
                </h3>

                <p className="relative leading-relaxed text-charcoal/65 md:col-span-6">
                  {point.description}
                </p>
              </div>
            </motion.li>
          ))}
          <motion.span
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewport}
            transition={{ duration: 1, ease: EASE }}
            className="block h-px w-full origin-left bg-charcoal/15"
          />
        </ul>

        <Rise delay={0.1}>
          <div className="mt-14 max-w-2xl border-l-2 border-clay bg-stone/70 p-7">
            <p className="leading-relaxed text-charcoal/65">{labels.note}</p>
          </div>
        </Rise>
      </div>
    </section>
  );
}
