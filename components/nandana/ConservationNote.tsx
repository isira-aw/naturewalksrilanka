"use client";

import { Words } from "@/components/ui/motion";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The dark band that carries the conservation story — the one place on the
 * site where the page stops and simply states where the guiding came from.
 */
export function ConservationNote({
  labels,
}: {
  labels: { eyebrow: string; title: string; quote: string };
}) {
  return (
    <section className="bg-charcoal py-24 text-warm-white md:py-32">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 md:px-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="font-utility text-xs uppercase tracking-[0.3em] text-warm-white/60"
        >
          {labels.eyebrow}
        </motion.p>

        <Words
          text={labels.title}
          delay={0.08}
          className="mt-7 font-display text-3xl leading-tight md:text-4xl"
        />

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className="mt-7 text-lg leading-relaxed text-warm-white/80"
        >
          {labels.quote}
        </motion.p>
      </div>
    </section>
  );
}
