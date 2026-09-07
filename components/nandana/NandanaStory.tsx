"use client";

import { motion } from "framer-motion";
import type { Profile } from "@/lib/content/schema";
import { ParallaxImage } from "@/components/ui/ParallaxImage";
import { Kicker, Rise, Words, viewport } from "@/components/ui/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The long version of who Nandana is: the portrait travelling inside its frame
 * beside the story, with the numbers counting up on the rule underneath. Same
 * composition as the home page's guide block, given room to run.
 */
export function NandanaStory({
  profile,
  eyebrow,
  title,
}: {
  profile: Profile;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="bg-warm-white pt-12 pb-20 md:pt-16 md:pb-28">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 md:grid-cols-12 md:gap-16 md:px-10">
        <ParallaxImage
          src={profile.portraitImage}
          alt={`Portrait of ${profile.name} in the field`}
          sizes="(min-width: 768px) 40vw, 100vw"
          className="aspect-[4/5] w-full md:order-2 md:col-span-5"
        />

        <div className="md:order-1 md:col-span-7">
          {eyebrow && <Kicker>{eyebrow}</Kicker>}
          <Words
            text={title}
            delay={0.05}
            className="mt-6 font-display text-3xl leading-tight tracking-tight text-charcoal md:text-4xl"
          />
          <Rise delay={0.15}>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-charcoal/75">
              {profile.story}
            </p>
          </Rise>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-charcoal/15 pt-8">
            {profile.stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewport}
                transition={{ duration: 0.8, ease: EASE, delay: index * 0.1 }}
              >
                <dt className="sr-only">{stat.label}</dt>
                {/* CONTENT_REQUIRED marks a fact still to be confirmed with
                    Nandana; it shows as a dash rather than a false number. */}
                <dd className="font-display text-3xl text-forest md:text-4xl">
                  {stat.value === "CONTENT_REQUIRED" ? "—" : stat.value}
                </dd>
                <p className="mt-2 font-utility text-[11px] uppercase tracking-[0.15em] text-charcoal/55">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
