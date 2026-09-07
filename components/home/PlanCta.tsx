"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";
import { Words } from "./primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The closing panel: the page ends on a photograph again, darkened almost to
 * forest, with the invitation centred over it — the frame the reference site
 * closes on. The other pages keep the plain FinalCTA band; this one is the
 * home page's own.
 */
export function PlanCta({
  whatsappNumber,
  labels,
  secondary,
}: {
  whatsappNumber: string;
  labels: { eyebrow: string; title: string; subtitle: string; cta: string };
  /** Optional second route into planning, e.g. the custom-tour wizard. */
  secondary?: { href: string; label: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-forest text-warm-white">
      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y }}
        className="absolute -inset-y-[10%] inset-x-0"
      >
        <Image
          src="/images/hero-2.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30"
        />
      </motion.div>
      <div className="absolute inset-0 bg-forest/75" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest via-transparent to-forest" />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6 md:px-10 md:py-36">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="font-utility text-xs uppercase tracking-[0.3em] text-warm-white/70"
        >
          {labels.eyebrow}
        </motion.p>

        <Words
          text={labels.title}
          delay={0.08}
          className="mt-7 font-display text-3xl leading-tight tracking-tight md:text-5xl"
        />

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className="mx-auto mt-6 max-w-lg leading-relaxed text-warm-white/80"
        >
          {labels.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.32 }}
          className="mt-11 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
        >
          <WhatsAppCTA
            phone={whatsappNumber}
            message={buildGeneralMessage()}
            variant="inverted"
            size="lg"
          >
            {labels.cta}
          </WhatsAppCTA>
          {secondary && (
            <Link
              href={secondary.href}
              className="group inline-flex items-center gap-3 font-medium text-warm-white/90 transition-colors hover:text-warm-white"
            >
              <span className="relative">
                {secondary.label}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-0 block h-px w-full origin-right scale-x-100 bg-warm-white/45 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:origin-left group-hover:scale-x-0"
                />
              </span>
              <span
                aria-hidden="true"
                className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5"
              >
                &#8594;
              </span>
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
