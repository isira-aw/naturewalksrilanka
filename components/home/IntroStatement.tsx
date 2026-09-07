"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Kicker, Ledger, Rise, Words } from "./primitives";

/**
 * The calm centred statement the reference site opens with once the
 * photograph has been left behind: one line answering "what is this?" before
 * the visitor is asked to do anything, set on a wide margin of empty page.
 */
export function IntroStatement({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  /* A very slight counter-drift as the block passes through the viewport,
     enough to separate it from the band underneath. */
  const y = useTransform(scrollYProgress, [0, 1], ["4%", "-4%"]);

  return (
    <section className="bg-warm-white pt-24 pb-20 md:pt-32 md:pb-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10">
        <motion.div
          ref={ref}
          style={reduceMotion ? undefined : { y }}
          className="mx-auto max-w-3xl text-center"
        >
          <Kicker className="justify-center">{eyebrow}</Kicker>

          <Words
            text={title}
            delay={0.05}
            className="mt-8 font-display text-3xl leading-[1.15] tracking-tight text-charcoal md:text-[2.75rem]"
          />

          <Rise delay={0.25} className="mt-7">
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-charcoal/70">{body}</p>
          </Rise>

          <Ledger className="mx-auto mt-14 max-w-[6rem]" />
        </motion.div>
      </div>
    </section>
  );
}
