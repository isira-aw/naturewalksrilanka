"use client";

import { motion } from "framer-motion";
import type { Profile } from "@/lib/content/schema";
import { Kicker, Words, viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Why travel with him, as numbered editorial rows — the same list treatment as
 * the home page, closed by his specialities set as a single ruled line.
 */
export function WhyNandana({
  profile,
  eyebrow,
  title,
  points,
}: {
  profile: Profile;
  eyebrow: string;
  title: string;
  points: { title: string; description: string }[];
}) {
  return (
    <section className="bg-stone py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="max-w-2xl">
          <Kicker>{eyebrow}</Kicker>
          <Words
            text={title}
            delay={0.05}
            className="mt-6 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
          />
        </div>

        <ul className="mt-14 border-t border-charcoal/15">
          {points.map((point, index) => (
            <motion.li
              key={point.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.8, ease: EASE, delay: index * 0.1 }}
              className="group grid gap-3 border-b border-charcoal/15 py-8 md:grid-cols-12 md:items-baseline md:gap-8 md:py-10"
            >
              <p className="font-utility text-xs uppercase tracking-[0.2em] text-charcoal/35 transition-colors duration-500 group-hover:text-forest md:col-span-1">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="font-display text-xl text-charcoal md:col-span-5 md:text-2xl">
                {point.title}
              </h3>
              <p className="leading-relaxed text-charcoal/70 md:col-span-6">
                {point.description}
              </p>
            </motion.li>
          ))}
        </ul>

        {profile.specialties.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-3 font-utility text-xs uppercase tracking-[0.15em] text-charcoal/55">
            {profile.specialties.map((specialty) => (
              <li key={specialty}>{specialty}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
