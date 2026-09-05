"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";
import type { Navigation } from "@/lib/content/schema";
import { Container } from "@/components/ui/Container";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";

/**
 * Hero slideshow. Edit this one list to change what rotates behind the hero.
 * Only hero-1 and hero-2 are 1920x1080; the rest are 600x400 and will look
 * soft full-bleed until real photography replaces them (see lib/content/imageMap.ts).
 */
const SLIDES = [
  { src: "/images/hero-1.jpg", alt: "Nandana Hewagamage with travellers at the Nine Arches Bridge, Ella" },
  { src: "/images/hero-2.jpg", alt: "Birdwatching with spotting scopes beside a dry-zone lagoon" },
  { src: "/images/story-1.jpg", alt: "Birding on a forest trail in Sri Lanka's highlands" },
  { src: "/images/tours/tour-16-days.jpg", alt: "Travellers at the Lion Rock stairway, Sigiriya" },
  { src: "/images/story-2.jpg", alt: "A photography group in the Sinharaja rainforest" },
];

const SLIDE_MS = 4000;

export function HomeHero({
  labels,
  navigation,
}: {
  labels: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    meta: string;
    whatsapp: string;
  };
  navigation: Navigation;
}) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section className="relative flex min-h-[88vh] items-end overflow-hidden bg-charcoal">
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          /* One slide carries the description; the rest are decorative so a
             screen reader isn't read a new photo caption every four seconds. */
          alt={i === 0 ? slide.alt : ""}
          aria-hidden={i !== 0}
          fill
          priority={i === 0}
          sizes="100vw"
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out",
            i === index ? "opacity-100" : "opacity-0"
          )}
        />
      ))}

      {/* Layered rather than one heavy wash: the bottom-left stays dark enough
          for the type while the right side of the photograph keeps its detail. */}
      <div className="absolute inset-0 bg-charcoal/35 md:bg-charcoal/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent" />

      <Container className="relative z-10 pb-16 pt-28 md:pb-28 md:pt-32">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-2xl">
          <p className="font-utility text-xs uppercase tracking-[0.3em] text-warm-white/70">
            {labels.eyebrow}
          </p>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.08 }}
          className="mt-5 max-w-3xl font-display text-[2.75rem] leading-[1.05] tracking-tight text-warm-white sm:text-6xl md:text-7xl"
        >
          {labels.titleLine1}
          <br />
          {labels.titleLine2}
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.16 }}
          className="mt-6 max-w-md text-lg leading-relaxed text-warm-white/80"
        >
          {labels.subtitle}
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.24 }}
          className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
        >
          <Link
            href="/tours"
            className="rounded-full bg-warm-white px-8 py-4 font-medium text-charcoal transition-colors hover:bg-stone"
          >
            {labels.ctaPrimary}
          </Link>
          <Link
            href="/custom-tour"
            className="font-medium text-warm-white/90 underline decoration-warm-white/40 underline-offset-8 transition-colors hover:text-warm-white hover:decoration-warm-white"
          >
            {labels.ctaSecondary}
          </Link>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.32 }}
          className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-warm-white/15 pt-6"
        >
          <p className="font-utility text-xs uppercase tracking-[0.15em] text-warm-white/60">
            {labels.meta}
          </p>
          <WhatsAppCTA
            phone={navigation.contact.whatsappNumber}
            message={buildGeneralMessage()}
            variant="quiet"
            size="md"
          >
            {labels.whatsapp}
          </WhatsAppCTA>

          <div className="ms-auto flex items-center gap-2">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${SLIDES.length}`}
                aria-current={i === index}
                className="group -m-1.5 p-1.5"
              >
                <span
                  className={cn(
                    "block h-1.5 w-1.5 rounded-full transition-colors",
                    i === index
                      ? "bg-warm-white"
                      : "bg-warm-white/35 group-hover:bg-warm-white/70"
                  )}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
