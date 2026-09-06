"use client";

import { motion } from "framer-motion";
import { fadeUpDelayed, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

/**
 * Scroll-in wrapper used across the home page so sections arrive as you reach
 * them rather than all at once. MotionConfig has reducedMotion="user", so this
 * collapses to a plain fade for anyone who asks for less movement.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const Component = motion[as];
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUpDelayed(delay)}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}
