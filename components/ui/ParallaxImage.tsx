"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/**
 * A photograph that travels slowly inside its own frame as the page scrolls.
 * The image is inset by `travel` above and below the frame, so the drift never
 * exposes an edge; reduced motion pins it still.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imageClassName,
  sizes = "100vw",
  priority = false,
  travel = 9,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Percentage of the frame height the photograph travels, per side. */
  travel?: number;
  /** Overlays — gradients, captions — drawn above the photograph. */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${travel}%`, `${travel}%`]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div
        style={{
          top: `-${travel}%`,
          bottom: `-${travel}%`,
          ...(reduceMotion ? {} : { y }),
        }}
        className="absolute inset-x-0"
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-cover", imageClassName)}
        />
      </motion.div>
      {children}
    </div>
  );
}
