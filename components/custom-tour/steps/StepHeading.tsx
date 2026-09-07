import { cn } from "@/lib/utils/cn";

/**
 * One heading treatment for every wizard step — question, then optional hint —
 * so moving between steps feels like one form rather than seven screens.
 */
export function StepHeading({
  title,
  hint,
  as = "h2",
  className,
}: {
  title: string;
  hint?: string;
  as?: "h2" | "legend";
  className?: string;
}) {
  const Title = as;
  return (
    <div className={cn("w-full", className)}>
      <Title className="font-display text-2xl leading-tight text-charcoal md:text-[1.75rem]">
        {title}
      </Title>
      {hint && <p className="mt-2 max-w-xl text-sm leading-relaxed text-charcoal/60">{hint}</p>}
    </div>
  );
}
