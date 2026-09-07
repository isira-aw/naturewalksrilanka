"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * The motion vocabulary every page is built from, so the site reads as one
 * choreography rather than a stack of separately animated sections:
 *
 *   Kicker   — the small uppercase label, arriving behind a rule that draws in
 *   Words    — display headings revealed word by word from behind a mask
 *   Rise     — the general-purpose "arrive as you reach it" wrapper
 *   Ledger   — a hairline that draws itself across the container
 *   ArrowLink / ArrowButton — the underline-and-arrow link treatment
 *
 * MotionConfig sets reducedMotion="user" at the root, so every transform here
 * collapses to a plain fade for anyone who asks for less movement.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export const viewport = { once: true, margin: "-90px" } as const;

export function Kicker({
  children,
  tone = "forest",
  className,
}: {
  children: React.ReactNode;
  tone?: "forest" | "light";
  className?: string;
}) {
  return (
    <motion.p
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className={cn(
        "flex items-center gap-4 font-utility text-xs uppercase tracking-[0.3em]",
        tone === "forest" ? "text-forest" : "text-warm-white/70",
        className
      )}
    >
      <motion.span
        aria-hidden="true"
        variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1 } }}
        transition={{ duration: 0.9, ease: EASE }}
        className={cn(
          "block h-px w-10 origin-left",
          tone === "forest" ? "bg-forest/50" : "bg-warm-white/40"
        )}
      />
      <motion.span
        variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
      >
        {children}
      </motion.span>
    </motion.p>
  );
}

/**
 * A heading revealed word by word from behind its own line box — the reveal
 * the reference site uses on every section title. Rendering one span per word
 * keeps normal wrapping and leaves the text selectable and readable to a
 * screen reader as a single string.
 */
export function Words({
  text,
  className,
  delay = 0,
  as = "h2",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];
  const words = text.split(" ");

  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      transition={{ staggerChildren: reduceMotion ? 0 : 0.045, delayChildren: delay }}
      className={className}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            variants={{
              hidden: { y: "110%", opacity: 0 },
              visible: { y: "0%", opacity: 1 },
            }}
            transition={{ duration: 0.85, ease: EASE }}
            className="inline-block"
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export function Rise({
  children,
  delay = 0,
  distance = 28,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
  as?: "div" | "li" | "section" | "p";
}) {
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/** A hairline rule that draws itself in from the left as it comes into view. */
export function Ledger({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={viewport}
      transition={{ duration: 1.1, ease: EASE }}
      className={cn(
        "h-px w-full origin-left",
        tone === "dark" ? "bg-charcoal/15" : "bg-warm-white/25",
        className
      )}
    />
  );
}

const arrowLinkBase =
  "group inline-flex items-center gap-3 font-utility text-xs uppercase tracking-[0.2em] transition-colors";

export function ArrowLink({
  href,
  children,
  tone = "forest",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "forest" | "light";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        arrowLinkBase,
        tone === "forest" ? "text-forest hover:text-forest-dark" : "text-warm-white/85 hover:text-warm-white",
        className
      )}
    >
      <ArrowLabel tone={tone}>{children}</ArrowLabel>
    </Link>
  );
}

export function ArrowLabel({
  children,
  tone = "forest",
}: {
  children: React.ReactNode;
  tone?: "forest" | "light";
}) {
  return (
    <>
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1.5 left-0 block h-px w-full origin-right scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:origin-left group-hover:scale-x-0",
            tone === "forest" ? "bg-forest/45" : "bg-warm-white/45"
          )}
        />
      </span>
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5"
      >
        &#8594;
      </span>
    </>
  );
}

/** Round carousel control, matching the reference site's slider chrome. */
export function CarouselButton({
  direction,
  onClick,
  disabled,
  label,
  tone = "dark",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
  label: string;
  tone?: "dark" | "light";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30",
        tone === "dark"
          ? "border-charcoal/20 text-charcoal hover:border-forest hover:bg-forest hover:text-warm-white"
          : "border-warm-white/35 text-warm-white hover:bg-warm-white hover:text-charcoal"
      )}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {direction === "prev" ? "←" : "→"}
      </span>
    </button>
  );
}
