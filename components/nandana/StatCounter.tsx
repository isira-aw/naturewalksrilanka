"use client";

import { motion } from "framer-motion";
import { fadeUp, viewportOnce } from "@/lib/motion";

export function StatCounter({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-3 gap-6 border-t border-stone-dark pt-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          transition={{ delay: i * 0.1 }}
        >
          <dt className="sr-only">{stat.label}</dt>
          <dd className="font-display text-3xl text-forest md:text-4xl">
            {stat.value === "CONTENT_REQUIRED" ? "—" : stat.value}
          </dd>
          <p className="mt-1 font-utility text-xs uppercase tracking-wide text-charcoal/60">
            {stat.label}
          </p>
        </motion.div>
      ))}
    </dl>
  );
}
