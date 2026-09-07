"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { Profile } from "@/lib/content/schema";
import { ArrowLink, Kicker, Rise, Words } from "@/components/ui/motion";

/**
 * Home-page version of "who is Nandana": the founder and lead guide behind the
 * company, in short. The full story stays on the About page.
 *
 * Composed as the reference site composes its portrait features — an
 * overscaled photograph that travels slowly inside its own frame while the
 * text column stays still, so the two columns move at different speeds.
 */
export function GuideFeature({
  profile,
  labels,
}: {
  profile: Profile;
  labels: { eyebrow: string; role: string; body: string; cta: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // The photograph is rendered 18% taller than its frame, then travels through it.
  const imageY = useTransform(scrollYProgress, [0, 1], ["-9%", "9%"]);

  return (
    <section className="bg-stone py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[4/5] w-full overflow-hidden md:col-span-5"
          >
            <motion.div
              style={reduceMotion ? undefined : { y: imageY }}
              className="absolute -inset-y-[9%] inset-x-0"
            >
              <Image
                src={profile.portraitImage}
                alt={`Portrait of ${profile.name} in the field`}
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          </motion.div>

          <div className="md:col-span-7">
            <Kicker>{labels.eyebrow}</Kicker>

            <Words
              text={profile.name}
              delay={0.05}
              className="mt-6 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
            />

            <Rise delay={0.15}>
              <p className="mt-3 font-utility text-xs uppercase tracking-[0.2em] text-charcoal/55">
                {labels.role}
              </p>
            </Rise>

            <Rise delay={0.2}>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-charcoal/75">{labels.body}</p>
            </Rise>

            <Rise delay={0.28}>
              <blockquote className="relative mt-9 max-w-xl pl-6">
                <motion.span
                  aria-hidden="true"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: "-90px" }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                  className="absolute inset-y-0 left-0 block w-px origin-top bg-forest"
                />
                <p className="font-display text-xl leading-relaxed text-charcoal/80">
                  {profile.philosophy}
                </p>
              </blockquote>
            </Rise>

            <Rise delay={0.34}>
              <ul className="mt-9 flex flex-wrap gap-x-10 gap-y-3 border-t border-charcoal/15 pt-6 font-utility text-xs uppercase tracking-[0.15em] text-charcoal/55">
                <li>{profile.experience}</li>
                <li>{profile.certification}</li>
              </ul>
            </Rise>

            <Rise delay={0.4}>
              <ArrowLink href="/about-nandana" className="mt-9">
                {labels.cta}
              </ArrowLink>
            </Rise>
          </div>
        </div>
      </div>
    </section>
  );
}
