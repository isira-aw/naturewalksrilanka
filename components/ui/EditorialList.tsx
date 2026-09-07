"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { viewport } from "./motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A list set as editorial rows rather than bullets: a hairline per item, a
 * number where the meaning is a sequence, and nothing else. This is the shape
 * the site uses everywhere a list of short facts appears — species, what's
 * included, what to know — so no page needs an icon to say "list".
 */
export function EditorialList({
  items,
  numbered = false,
  columns = 1,
  tone = "dark",
  className,
}: {
  items: string[];
  numbered?: boolean;
  columns?: 1 | 2;
  tone?: "dark" | "light";
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <ul
      className={cn(
        "border-t",
        tone === "dark" ? "border-charcoal/15" : "border-warm-white/20",
        columns === 2 && "sm:columns-2 sm:gap-x-12",
        className
      )}
    >
      {items.map((item, index) => (
        <motion.li
          key={item}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.6, ease: EASE, delay: (index % 6) * 0.06 }}
          className={cn(
            "flex gap-5 border-b py-4 leading-relaxed break-inside-avoid",
            tone === "dark" ? "border-charcoal/15 text-charcoal/80" : "border-warm-white/20 text-warm-white/85"
          )}
        >
          {numbered && (
            <span
              aria-hidden="true"
              className={cn(
                "shrink-0 font-utility text-xs uppercase tracking-[0.2em]",
                tone === "dark" ? "text-charcoal/35" : "text-warm-white/45"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          <span>{item}</span>
        </motion.li>
      ))}
    </ul>
  );
}
