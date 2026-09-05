import { cn } from "@/lib/utils/cn";
import { Container } from "./Container";

type Tone = "warm" | "stone" | "forest" | "charcoal";

/**
 * One spacing and surface rhythm for every section on the site, so pages read
 * as a single design rather than a stack of independently styled blocks.
 */
const tones: Record<Tone, string> = {
  warm: "bg-warm-white text-charcoal",
  stone: "bg-stone text-charcoal",
  forest: "bg-forest text-warm-white",
  charcoal: "bg-charcoal text-warm-white",
};

/**
 * Top padding sits tighter than bottom, so a section's heading reads as
 * belonging to the content under it rather than floating between two blocks.
 */
const sizes = {
  compact: "pt-12 pb-16 md:pt-16 md:pb-20",
  default: "pt-16 pb-20 md:pt-20 md:pb-28",
  spacious: "pt-20 pb-24 md:pt-24 md:pb-36",
};

export function Section({
  tone = "warm",
  size = "default",
  className,
  containerClassName,
  children,
  id,
}: {
  tone?: Tone;
  size?: keyof typeof sizes;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn(tones[tone], sizes[size], className)}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
