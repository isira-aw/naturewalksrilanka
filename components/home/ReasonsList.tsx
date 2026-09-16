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
  labels: { eyebrow: string; title: string; intro: string; note: string };
  points: { title: string; description: string }[];
}) {
  return (
    <section className="bg-warm-white py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <Kicker>{labels.eyebrow}</Kicker>
            <Words
              text={labels.title}
              delay={0.05}
              className="mt-6 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
            />
            <Rise delay={0.15}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-charcoal/65">
                {labels.intro}
              </p>
            </Rise>
          </div>

          <div className="md:col-span-7">
            <ul>
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

                  <div className="relative py-8 md:py-10">
                    <p className="font-display text-4xl leading-none tracking-tight text-charcoal/25 transition-colors duration-500 group-hover:text-forest md:text-5xl">
                      {String(index + 1).padStart(2, "0")}
                    </p>

                    <h3 className="relative mt-4 font-display text-xl text-charcoal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 md:text-2xl">
                      {point.title}
                    </h3>

                    <p className="relative mt-3 max-w-xl leading-relaxed text-charcoal/65">
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
          </div>
        </div>

        <Rise delay={0.1}>
          <p className="mt-14 max-w-2xl font-display text-lg italic leading-relaxed text-charcoal/70">
            {labels.note}
          </p>
        </Rise>
      </div>
    </section>
  );
}
