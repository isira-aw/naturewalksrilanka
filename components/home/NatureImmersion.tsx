"use client";

import { useRef } from "react";
import { Photo } from "@/components/ui/Photo";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One full-bleed photograph and three lines of copy — a breath between the
 * island-story rail and the journeys section, deliberately without a card, a
 * button or a grid. The reference site's quiet single-image "chapter break":
 * it exists to be looked at, not clicked through.
 */
export function NatureImmersion({
  labels,
}: {
  labels: { label: string; title: string; body: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section
      ref={ref}
      className="relative flex h-[80svh] min-h-[520px] items-end overflow-hidden bg-charcoal md:h-[90svh]"
    >
      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y }}
        className="absolute -inset-y-[6%] inset-x-0"
      >
        <Photo
          src="/images/story-1.jpg"
          alt="A leaf-strewn forest trail through Sri Lanka's rainforest canopy"
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 md:px-10 md:pb-20">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="font-utility text-xs uppercase tracking-[0.35em] text-warm-white/75"
        >
          {labels.label}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          className="mt-5 max-w-xl font-display text-4xl leading-[1.05] tracking-tight text-warm-white md:text-6xl"
        >
          {labels.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.22 }}
          className="mt-5 max-w-sm text-lg leading-relaxed text-warm-white/80"
        >
          {labels.body}
        </motion.p>
      </div>
    </section>
  );
}
