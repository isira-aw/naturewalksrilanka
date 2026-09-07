"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";

export type Stat = { value: string; label: string };

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The full-bleed dark band that breaks the page between two light sections —
 * the claim the page would otherwise spend a paragraph on, as four numbers.
 * Digits count up once when the ribbon scrolls into view, the hairlines
 * between columns draw themselves in, and the whole band drifts slightly
 * against the scroll so it reads as a layer rather than a box.
 */
export function StatsRibbon({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-forest text-warm-white">
      {/* A soft light sitting behind the numbers, drifting as you scroll. */}
      <motion.span
        aria-hidden="true"
        style={reduceMotion ? undefined : { y }}
        className="pointer-events-none absolute inset-x-0 -top-1/2 h-[200%] bg-[radial-gradient(ellipse_at_50%_50%,rgba(250,247,240,0.10),transparent_62%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div ref={ref} className="grid grid-cols-2 py-16 md:grid-cols-4 md:py-20">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.1 }}
              className="relative px-2 py-6 text-center md:px-8 md:py-2"
            >
              {i > 0 && (
                <motion.span
                  aria-hidden="true"
                  initial={{ scaleY: 0 }}
                  animate={inView ? { scaleY: 1 } : undefined}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.1 }}
                  className="absolute inset-y-0 left-0 hidden w-px origin-top bg-warm-white/20 md:block"
                />
              )}
              <p className="font-display text-4xl leading-none tracking-tight md:text-5xl">
                <CountUp value={stat.value} active={inView} />
              </p>
              <p className="mt-4 font-utility text-[11px] uppercase leading-relaxed tracking-[0.2em] text-warm-white/65">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUp({ value, active }: { value: string; active: boolean }) {
  const reduceMotion = useReducedMotion();
  /* Split once into primitives: a fresh match array on every render would
     restart the effect below and pin the display at zero. */
  const { prefix, target, suffix } = useMemo(() => {
    const match = value.match(/^(\D*)(\d+)(\D*)$/);
    return match
      ? { prefix: match[1], target: Number(match[2]), suffix: match[3] }
      : { prefix: value, target: null, suffix: "" };
  }, [value]);

  const animates = target !== null && !reduceMotion;
  const [shown, setShown] = useState(target ?? 0);

  useEffect(() => {
    if (!animates || !active) return;
    const duration = 1400;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      // Ease-out so the number settles rather than stopping dead.
      setShown(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, animates, target]);

  if (target === null) return <>{value}</>;
  return (
    <>
      {prefix}
      {animates && !active ? 0 : shown}
      {suffix}
    </>
  );
}
