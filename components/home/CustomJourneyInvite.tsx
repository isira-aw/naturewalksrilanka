"use client";

import { useRef } from "react";
import { Photo } from "@/components/ui/Photo";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Rise, Words, viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The custom-tour chapter of the home page: the one section whose whole job is
 * to say that the four journeys above are a starting point rather than a menu.
 *
 * It sits on a photograph rather than on the page colour, because it is the
 * second-most important thing a visitor can do here after reading a journey,
 * and the steps strip is the wizard's own step labels — a visitor can see
 * exactly what they are being asked for before they click into it.
 */
export function CustomJourneyInvite({
  labels,
  steps,
  image,
}: {
  labels: {
    eyebrow: string;
    title: string;
    body: string;
    stepsLabel: string;
    cta: string;
  };
  /** The wizard's own step names, in order. */
  steps: string[];
  image: { src: string; alt: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-charcoal text-warm-white">
      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y }}
        className="absolute -inset-y-[8%] inset-x-0"
      >
        <Photo src={image.src} alt="" sizes="100vw" className="object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-charcoal/72" />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/70 to-charcoal/25" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:px-10 md:py-32">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.8, ease: EASE }}
            className="flex items-center gap-4 font-utility text-xs uppercase tracking-[0.3em] text-warm-white/70"
          >
            <motion.span
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={viewport}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              className="block h-px w-10 origin-left bg-warm-white/40"
            />
            {labels.eyebrow}
          </motion.p>

          <Words
            text={labels.title}
            delay={0.08}
            className="mt-7 font-display text-3xl leading-[1.15] tracking-tight md:text-5xl"
          />

          <Rise delay={0.22}>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-warm-white/80">{labels.body}</p>
          </Rise>
        </div>

        <Rise delay={0.3}>
          <p className="mt-14 font-utility text-[11px] uppercase tracking-[0.25em] text-warm-white/50">
            {labels.stepsLabel}
          </p>
        </Rise>

        <ul className="mt-6 grid gap-x-8 gap-y-6 border-t border-warm-white/15 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.li
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.8, ease: EASE, delay: index * 0.08 }}
              className="flex items-baseline gap-4"
            >
              <span className="font-utility text-xs uppercase tracking-[0.2em] text-warm-white/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-xl text-warm-white/90">{step}</span>
            </motion.li>
          ))}
        </ul>

        <Rise delay={0.38}>
          <Link
            href="/custom-tour"
            className="group relative mt-12 inline-block overflow-hidden rounded-full bg-warm-white px-9 py-4 font-medium text-charcoal transition-colors duration-500 hover:text-warm-white"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 translate-y-full bg-forest transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
            />
            <span className="relative">{labels.cta}</span>
          </Link>
        </Rise>
      </div>
    </section>
  );
}
