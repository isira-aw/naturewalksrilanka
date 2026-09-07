"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Container } from "@/components/ui/Container";

export type Stat = { value: string; label: string };

/**
 * The claim the page would otherwise spend a paragraph on, as four numbers.
 * Digits count up once when the band scrolls into view; any non-numeric part of
 * the value ("20+", "100%") is preserved around the number.
 */
export function StatsBand({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="border-y border-forest-dark/40 bg-forest text-warm-white">
      <Container>
        <div
          ref={ref}
          className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-4 md:py-14"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              className="text-center md:text-left"
            >
              <p className="font-display text-4xl leading-none tracking-tight md:text-5xl">
                <CountUp value={stat.value} active={inView} />
              </p>
              <p className="mt-3 font-utility text-[11px] uppercase leading-relaxed tracking-[0.15em] text-warm-white/65">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
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
    const duration = 900;
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
