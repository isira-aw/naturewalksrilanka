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

const sizes = {
  compact: "py-16 md:py-20",
  default: "py-20 md:py-28",
  spacious: "py-24 md:py-36",
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
