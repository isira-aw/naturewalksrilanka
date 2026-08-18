"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { fadeUp } from "@/lib/motion";
import type { Navigation } from "@/lib/content/schema";
import { WhatsAppCTA } from "@/components/whatsapp/WhatsAppCTA";
import { buildGeneralMessage } from "@/lib/whatsapp/buildMessage";

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
  };
  navigation: Navigation;
}) {
  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-charcoal">
      <Image
        src="/images/hero-1.jpg"
        alt="Mist over Sri Lanka's rainforest hills at dawn"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent" />

      <div className="relative z-10 w-full px-6 pb-20 md:px-10 md:pb-28">
        <div className="mx-auto max-w-7xl">
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-4 font-utility text-xs uppercase tracking-[0.3em] text-warm-white/80"
          >
            {labels.eyebrow}
          </motion.p>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="max-w-3xl font-display text-5xl leading-[1.05] text-warm-white md:text-7xl"
          >
            {labels.titleLine1}
            <br />
            {labels.titleLine2}
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-lg text-lg text-warm-white/85"
          >
            {labels.subtitle}
          </motion.p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link
              href="/tours"
              className="rounded-full bg-forest px-8 py-4 font-medium text-warm-white transition-colors hover:bg-forest-light"
            >
              {labels.ctaPrimary}
            </Link>
            <Link
              href="/custom-tour"
              className="rounded-full border border-warm-white/50 px-8 py-4 font-medium text-warm-white transition-colors hover:border-warm-white hover:bg-warm-white/10"
            >
              {labels.ctaSecondary}
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="absolute right-6 top-8 z-10 hidden md:block">
        <WhatsAppCTA
          phone={navigation.contact.whatsappNumber}
          message={buildGeneralMessage()}
          variant="inverted"
          size="md"
        >
          Talk to Nandana
        </WhatsAppCTA>
      </div>
    </section>
  );
}
