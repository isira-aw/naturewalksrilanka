"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { Navigation } from "@/lib/content/schema";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";

/**
 * Full-height opening frame: one photograph at a time, held for SLIDE_MS while
 * it drifts closer, then crossfaded to the next. The title sits centred over
 * it and parallaxes away as the page scrolls, so the first section arrives
 * underneath the photograph rather than after it.
 *
 * Edit this one list to change what rotates behind the hero. Only hero-1 and
 * hero-2 are 1920x1080; the rest are 600x400 and will look soft full-bleed
 * until real photography replaces them (see lib/content/imageMap.ts).
 */
const SLIDES = [
  { src: "/images/hero/hero (1).jpg", alt: "image 1" },
  { src: "/images/hero/hero (2).jpg", alt: "image 2" },
  { src: "/images/hero/hero (3).jpg", alt: "image 3" },
];

const SLIDE_MS = 6000;
const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroShowcase({
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
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  /* The photograph leaves slower than the type above it: the depth cue the
     reference site opens with, held off entirely for reduced motion. */
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-38%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, index]);

  return (
    <section
      ref={ref}
      /* The header is sticky and in flow, so the frame takes the viewport minus
         its height and the fold still lands exactly at the hero's foot. */
      className="relative flex h-[calc(100svh-4rem)] min-h-[620px] items-center justify-center overflow-hidden bg-charcoal lg:h-[calc(100svh-5rem)]"
    >
      <motion.div style={reduceMotion ? undefined : { y: imageY }} className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={SLIDES[index].src}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.div
              initial={reduceMotion ? undefined : { scale: 1.14 }}
              animate={reduceMotion ? undefined : { scale: 1 }}
              transition={{ duration: SLIDE_MS / 1000 + 2, ease: "linear" }}
              className="absolute inset-0"
            >
              <Image
                src={SLIDES[index].src}
                /* The first frame carries the description; later frames are
                   decorative so a screen reader isn't read a new photo caption
                   every few seconds. */
                alt={index === 0 ? SLIDES[0].alt : ""}
                aria-hidden={index !== 0}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Three light washes rather than one heavy scrim: the centre stays legible
          while the edges of the photograph keep their detail. */}
      <div className="absolute inset-0 bg-charcoal/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-transparent to-charcoal/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(28,30,27,0.55)_100%)]" />

      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-4xl px-4 text-center sm:px-6 md:px-10"
      >
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          className="font-utility text-xs uppercase tracking-[0.4em] text-warm-white/75"
        >
          {labels.eyebrow}
        </motion.p>

        <h1 className="mt-7 font-display text-[2.75rem] leading-[1.05] tracking-tight text-warm-white sm:text-6xl md:text-7xl">
          {[labels.titleLine1, labels.titleLine2].map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.08em]">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.25 + i * 0.12 }}
                className="block"
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
          className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-warm-white/85"
        >
          {labels.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.68 }}
          className="mt-11 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
        >
          <Link
            href="/tours"
            className="group relative overflow-hidden rounded-full bg-warm-white px-9 py-4 font-medium text-charcoal transition-colors duration-500 hover:text-warm-white"
          >
            {/* The fill sweeps up from the base of the button on hover. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 translate-y-full bg-forest transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
            />
            <span className="relative">{labels.ctaPrimary}</span>
          </Link>
          <Link
            href="/custom-tour"
            className="group inline-flex items-center gap-3 font-medium text-warm-white/90 transition-colors hover:text-warm-white"
          >
            <span className="relative">
              {labels.ctaSecondary}
              <span
                aria-hidden="true"
                className="absolute -bottom-1.5 left-0 block h-px w-full origin-right scale-x-100 bg-warm-white/50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:origin-left group-hover:scale-x-0"
              />
            </span>
            <span
              aria-hidden="true"
              className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5"
            >
              &#8594;
            </span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Slide chrome: the meta line, WhatsApp and the segmented progress bar
          all sit on one baseline across the foot of the frame. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
        className="absolute inset-x-0 bottom-0 z-10"
      >
        <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 md:px-10 md:pb-10">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-warm-white/15 pt-6">
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
                  className="group py-3"
                >
                  <span className="block h-px w-8 overflow-hidden bg-warm-white/30 transition-colors group-hover:bg-warm-white/60 md:w-12">
                    {i === index && (
                      <motion.span
                        key={`${slide.src}-${index}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          duration: reduceMotion ? 0 : SLIDE_MS / 1000,
                          ease: "linear",
                        }}
                        className="block h-px w-full origin-left bg-warm-white"
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.8 }}
        className={cn(
          "pointer-events-none absolute bottom-28 left-1/2 hidden -translate-x-1/2 md:block",
          "h-14 w-px overflow-hidden bg-warm-white/20"
        )}
      >
        {/* A light travelling down the line, in place of a bouncing mouse icon. */}
        <motion.span
          animate={reduceMotion ? undefined : { y: ["-100%", "100%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="block h-1/2 w-px bg-warm-white/80"
        />
      </motion.span>
    </section>
  );
}
