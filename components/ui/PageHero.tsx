"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ParallaxImage } from "./ParallaxImage";
import { cn } from "@/lib/utils/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The opening frame every page below the home page uses: a photograph held at
 * a fixed height, darkened, with the title revealed line by line over it and
 * the content of the page arriving underneath as the type parallaxes away.
 *
 * `height="tall"` is for the section landing pages (Journeys, Sri Lanka),
 * "short" for the quieter ones (Contact, Privacy) where the photograph is
 * mostly a colour field behind a title.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  image,
  meta,
  actions,
  height = "tall",
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  image: { src: string; alt: string };
  /** Short facts set on one line under the title — duration, region, season. */
  meta?: string[];
  actions?: React.ReactNode;
  height?: "tall" | "short";
  align?: "left" | "center";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const lines = title.split("\n");

  return (
    <section
      ref={ref}
      className={cn(
        "relative flex overflow-hidden bg-charcoal",
        height === "tall"
          ? "min-h-[72svh] items-end pb-16 pt-32 md:min-h-[80svh] md:pb-24"
          : "min-h-[46svh] items-end pb-12 pt-28 md:min-h-[52svh] md:pb-16"
      )}
    >
      {/* The frame is positioned here rather than on ParallaxImage itself, so
          the component keeps its own `relative` and the photograph fills it. */}
      <div className="absolute inset-0">
        <ParallaxImage
          src={image.src}
          alt={image.alt}
          priority
          sizes="100vw"
          className="h-full w-full"
        />
      </div>

      <div className="absolute inset-0 bg-charcoal/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-charcoal/20" />

      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className={cn(
          "relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10",
          align === "center" && "text-center"
        )}
      >
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
            className={cn(
              "flex items-center gap-4 font-utility text-xs uppercase tracking-[0.3em] text-warm-white/70",
              align === "center" && "justify-center"
            )}
          >
            <motion.span
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
              className="block h-px w-10 origin-left bg-warm-white/40"
            />
            {eyebrow}
          </motion.p>
        )}

        <h1
          className={cn(
            "mt-6 font-display leading-[1.05] tracking-tight text-warm-white",
            height === "tall"
              ? "max-w-4xl text-[2.5rem] sm:text-5xl md:text-6xl"
              : "max-w-3xl text-[2rem] sm:text-4xl md:text-5xl",
            align === "center" && "mx-auto"
          )}
        >
          {lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.08em]">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1, ease: EASE, delay: 0.2 + i * 0.1 }}
                className="block"
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        {lead && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.45 }}
            className={cn(
              "mt-6 max-w-xl text-lg leading-relaxed text-warm-white/80",
              align === "center" && "mx-auto"
            )}
          >
            {lead}
          </motion.p>
        )}

        {meta && meta.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
            className={cn(
              "mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-warm-white/15 pt-6 font-utility text-xs uppercase tracking-[0.15em] text-warm-white/65",
              align === "center" && "justify-center"
            )}
          >
            {meta.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </motion.ul>
        )}

        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.65 }}
            className={cn(
              "mt-10 flex flex-wrap items-center gap-x-8 gap-y-4",
              align === "center" && "justify-center"
            )}
          >
            {actions}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
